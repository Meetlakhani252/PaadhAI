"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Flag, Plus, Star, Trash2, X, MessageSquareText, FileSearch } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { StudyLayout } from "@/components/study-layout";
import {
  examLabel,
  parseTopics,
  progressOf,
  STATUS_LABEL,
  useSubjects,
  type TopicStatus,
} from "@/lib/demo-store";

const STATUS_CLASS: Record<TopicStatus, string> = {
  not_started: "border-border bg-secondary text-secondary-foreground",
  in_progress: "border-transparent bg-accent text-accent-foreground",
  done: "border-transparent bg-primary text-primary-foreground",
};

function StatusPill({ status }: { status: TopicStatus }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-full text-[11px] font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function AddSubjectForm() {
  const { addSubject } = useSubjects();
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addSubject({
      name,
      examDate: examDate || null,
      topics: parseTopics(topics),
    });
    toast.success(`${name.trim()} added to your stack`);
    setName("");
    setExamDate("");
    setTopics("");
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="font-display text-xl tracking-tight text-foreground">
        Add a subject
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subject-name">Subject name</Label>
          <Input
            id="subject-name"
            placeholder="e.g. Data Structures"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject-exam">
            Exam date <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="subject-exam"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="subject-topics">
          Topics{" "}
          <span className="text-muted-foreground">
            (one per line or comma-separated)
          </span>
        </Label>
        <Textarea
          id="subject-topics"
          rows={3}
          placeholder={"Arrays\nLinked lists\nTrees"}
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
        />
      </div>

      <Button type="submit" className="mt-5 rounded-full">
        <Plus className="mr-1.5 size-4" />
        Add subject
      </Button>
    </form>
  );
}

function TopicRow({
  subjectId,
  topicId,
  title,
  status,
  weak,
}: {
  subjectId: string;
  topicId: string;
  title: string;
  status: TopicStatus;
  weak: boolean;
}) {
  const { cycleTopicStatus, removeTopic, toggleTopicWeak } = useSubjects();

  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary/60">
      <button
        type="button"
        onClick={() => cycleTopicStatus(subjectId, topicId)}
        title={`Mark as ${STATUS_LABEL[
          status === "not_started"
            ? "in_progress"
            : status === "in_progress"
              ? "done"
              : "not_started"
        ]}`}
        className="text-left"
      >
        <StatusPill status={status} />
      </button>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          status === "done" ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {title}
      </span>
      <button
        type="button"
        aria-label={weak ? "Unmark as weak" : "Mark as weak"}
        aria-pressed={weak}
        onClick={() => toggleTopicWeak(subjectId, topicId)}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${
          weak
            ? "text-accent-foreground"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        }`}
      >
        <Star className={`size-3.5 ${weak ? "fill-current" : ""}`} />
      </button>
      <button
        type="button"
        aria-label={`Remove ${title}`}
        onClick={() => removeTopic(subjectId, topicId)}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 opacity-0 transition-all hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

function AddTopicRow({ subjectId }: { subjectId: string }) {
  const { addTopic } = useSubjects();
  const [title, setTitle] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addTopic(subjectId, title);
    setTitle("");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-2 pt-1">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a topic…"
        aria-label="New topic"
        className="h-8 rounded-full bg-secondary/60 text-sm"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        aria-label="Add topic"
        className="size-8 shrink-0 rounded-full"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

function SubjectsContent() {
  const { subjects, removeSubject } = useSubjects();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="eyebrow">Subjects</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
        Your subjects
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tap a status pill to cycle it — not started, in progress, done.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {subjects.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <h2 className="font-display text-2xl text-foreground">
                Nothing here yet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your first subject using the form beside this card.
              </p>
            </div>
          )}

          {subjects.map((subject) => {
            const progress = progressOf(subject);
            const exam = examLabel(subject.examDate);

            return (
              <article
                key={subject.id}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl tracking-tight text-foreground">
                      {subject.name}
                    </h2>
                    {exam && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                        <CalendarClock className="size-3.5" />
                        {exam}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/subjects/${subject.id}/doubts`}
                      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="AI Doubts"
                    >
                      <MessageSquareText className="size-4" />
                    </Link>
                    <Link
                      href={`/subjects/${subject.id}/papers`}
                      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Past Papers"
                    >
                      <FileSearch className="size-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${subject.name}`}
                      onClick={() => {
                        removeSubject(subject.id);
                        toast.success(`${subject.name} removed`);
                      }}
                      className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Progress value={progress} className="h-1.5" />
                  <span className="w-9 shrink-0 text-right text-xs font-semibold text-foreground">
                    {progress}%
                  </span>
                </div>

                {subject.topics && subject.topics.length > 0 && (
                  <ul className="mt-3 divide-y divide-border/70">
                    {subject.topics.map((topic) => (
                      <TopicRow
                        key={topic.id}
                        subjectId={subject.id}
                        topicId={topic.id}
                        title={topic.title}
                        status={topic.status}
                        weak={topic.weak}
                      />
                    ))}
                  </ul>
                )}
                <AddTopicRow subjectId={subject.id} />
              </article>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-24">
          <AddSubjectForm />
          <p className="mt-4 flex items-center gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
            <Flag className="size-3.5 shrink-0" />
            Star a topic to flag it as weak — weak topics show up on your home
            dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <StudyLayout>
      <SubjectsContent />
    </StudyLayout>
  );
}

