"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { getSubjects, createSubject, deleteSubject } from "@/app/actions/subjects";
import {
  getTopicsBySubject,
  addTopics,
  updateTopicStatus,
  toggleTopicWeak as dbToggleTopicWeak,
  deleteTopic,
} from "@/app/actions/topics";

export type TopicStatus = "not_started" | "in_progress" | "done";

export type Topic = {
  id: string;
  title: string;
  status: TopicStatus;
  weak: boolean;
};

export type Subject = {
  id: string;
  name: string;
  examDate: string | null;
  topics: Topic[];
};

const STORAGE_KEY = "studystack.subjects.v1";

export const STATUS_ORDER: TopicStatus[] = ["not_started", "in_progress", "done"];

export const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

export function nextStatus(status: TopicStatus): TopicStatus {
  const idx = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length] ?? "not_started";
}

function toDbStatus(s: TopicStatus): "Not Started" | "In Progress" | "Done" {
  if (s === "in_progress") return "In Progress";
  if (s === "done") return "Done";
  return "Not Started";
}

function fromDbStatus(s: string): TopicStatus {
  if (s === "In Progress" || s === "in_progress") return "in_progress";
  if (s === "Done" || s === "done") return "done";
  return "not_started";
}

export function progressOf(subject: Subject): number {
  if (!subject.topics || subject.topics.length === 0) return 0;
  const done = subject.topics.filter((t) => t.status === "done").length;
  return Math.round((done / subject.topics.length) * 100);
}

export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function examLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const n = daysUntil(dateStr);
  if (Number.isNaN(n)) return null;
  if (n === 0) return "Exam today";
  if (n === 1) return "Exam tomorrow";
  if (n > 1) return `Exam in ${n} days`;
  if (n === -1) return "Exam was yesterday";
  return `Exam was ${-n} days ago`;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseTopics(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const title = raw.trim();
    const key = title.toLowerCase();
    if (title && !seen.has(key)) {
      seen.add(key);
      out.push(title);
    }
  }
  return out;
}

type SubjectsStore = {
  subjects: Subject[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addSubject: (input: { name: string; examDate: string | null; topics: string[] }) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;
  addTopic: (subjectId: string, title: string) => Promise<void>;
  removeTopic: (subjectId: string, topicId: string) => Promise<void>;
  cycleTopicStatus: (subjectId: string, topicId: string) => Promise<void>;
  toggleTopicWeak: (subjectId: string, topicId: string) => Promise<void>;
};

const SubjectsContext = createContext<SubjectsStore | null>(null);

export function SubjectsProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const dbSubjects = await getSubjects();
      const loaded: Subject[] = await Promise.all(
        dbSubjects.map(async (s) => {
          const dbTopics = await getTopicsBySubject(s.id);
          return {
            id: s.id,
            name: s.name,
            examDate: s.exam_date || null,
            topics: dbTopics.map((t) => ({
              id: t.id,
              title: t.title,
              status: fromDbStatus(t.status),
              weak: Boolean(t.is_weak),
            })),
          };
        }),
      );
      setSubjects(loaded);
    } catch {
      // Fallback to local storage if offline or query fails
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setSubjects(JSON.parse(raw));
      } catch {
        // start empty
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadFromBackend();
    } else {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setSubjects(JSON.parse(raw));
      } catch {
        // start empty
      }
      setIsLoading(false);
    }
  }, [isSignedIn, loadFromBackend]);

  useEffect(() => {
    if (!isSignedIn) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
      } catch {
        // quota exceeded or private mode
      }
    }
  }, [subjects, isSignedIn]);

  const addSubject = async ({
    name,
    examDate,
    topics,
  }: {
    name: string;
    examDate: string | null;
    topics: string[];
  }) => {
    const tempId = uid();
    const newTopics: Topic[] = topics.map((t) => ({
      id: uid(),
      title: t,
      status: "not_started",
      weak: false,
    }));

    const optimisticSubject: Subject = {
      id: tempId,
      name: name.trim(),
      examDate,
      topics: newTopics,
    };

    setSubjects((prev) => [optimisticSubject, ...prev]);

    if (isSignedIn) {
      try {
        const created = await createSubject({
          name: name.trim(),
          examDate: examDate || undefined,
        });

        let createdTopics: Topic[] = [];
        if (topics.length > 0) {
          const res = await addTopics(created.id, topics);
          createdTopics = res.map((t) => ({
            id: t.id,
            title: t.title,
            status: fromDbStatus(t.status),
            weak: Boolean(t.is_weak),
          }));
        }

        setSubjects((prev) =>
          prev.map((s) =>
            s.id === tempId
              ? {
                  id: created.id,
                  name: created.name,
                  examDate: created.exam_date || null,
                  topics: createdTopics,
                }
              : s,
          ),
        );
      } catch {
        await loadFromBackend();
      }
    }
  };

  const removeSubject = async (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    if (isSignedIn) {
      try {
        await deleteSubject(subjectId);
      } catch {
        await loadFromBackend();
      }
    }
  };

  const addTopic = async (subjectId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const tempId = uid();

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              topics: [...s.topics, { id: tempId, title: trimmed, status: "not_started", weak: false }],
            }
          : s,
      ),
    );

    if (isSignedIn) {
      try {
        const added = await addTopics(subjectId, [trimmed]);
        if (added && added.length > 0) {
          const fresh = added[0];
          setSubjects((prev) =>
            prev.map((s) =>
              s.id === subjectId
                ? {
                    ...s,
                    topics: s.topics.map((t) =>
                      t.id === tempId
                        ? {
                            id: fresh.id,
                            title: fresh.title,
                            status: fromDbStatus(fresh.status),
                            weak: Boolean(fresh.is_weak),
                          }
                        : t,
                    ),
                  }
                : s,
            ),
          );
        }
      } catch {
        await loadFromBackend();
      }
    }
  };

  const removeTopic = async (subjectId: string, topicId: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) } : s,
      ),
    );

    if (isSignedIn) {
      try {
        await deleteTopic(topicId);
      } catch {
        await loadFromBackend();
      }
    }
  };

  const cycleTopicStatus = async (subjectId: string, topicId: string) => {
    let targetNewStatus: TopicStatus = "not_started";

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          topics: s.topics.map((t) => {
            if (t.id === topicId) {
              targetNewStatus = nextStatus(t.status);
              return { ...t, status: targetNewStatus };
            }
            return t;
          }),
        };
      }),
    );

    if (isSignedIn) {
      try {
        await updateTopicStatus(topicId, toDbStatus(targetNewStatus));
      } catch {
        await loadFromBackend();
      }
    }
  };

  const toggleTopicWeak = async (subjectId: string, topicId: string) => {
    let nextWeak = false;

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          topics: s.topics.map((t) => {
            if (t.id === topicId) {
              nextWeak = !t.weak;
              return { ...t, weak: nextWeak };
            }
            return t;
          }),
        };
      }),
    );

    if (isSignedIn) {
      try {
        await dbToggleTopicWeak(topicId, nextWeak);
      } catch {
        await loadFromBackend();
      }
    }
  };

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        isLoading,
        refresh: loadFromBackend,
        addSubject,
        removeSubject,
        addTopic,
        removeTopic,
        cycleTopicStatus,
        toggleTopicWeak,
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
}

export function useSubjects() {
  const ctx = useContext(SubjectsContext);
  if (!ctx) throw new Error("useSubjects must be used within SubjectsProvider");
  return ctx;
}

