"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileSearch,
  FileText,
  Flame,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StudyLayout } from "@/components/study-layout";
import {
  daysUntil,
  examLabel,
  progressOf,
  useSubjects,
  type Subject,
  type Topic,
  type TopicStatus,
} from "@/lib/demo-store";
import { useProfile } from "@/lib/profile";
import { createAndSolveDoubt } from "@/app/actions/doubts";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night session";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function BentoDashboardContent() {
  const router = useRouter();
  const { profile } = useProfile();
  const { subjects, cycleTopicStatus, toggleTopicWeak } = useSubjects();

  // Quick Doubt State
  const [quickQuestion, setQuickQuestion] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isAskingDoubt, setIsAskingDoubt] = useState(false);

  const firstName = profile.name.trim().split(/\s+/)[0];

  // Aggregated Topic Metrics
  const allTopics = useMemo(() => subjects.flatMap((s) => s.topics || []), [subjects]);
  const doneTopics = useMemo(() => allTopics.filter((t) => t.status === "done"), [allTopics]);
  const inProgressTopics = useMemo(() => allTopics.filter((t) => t.status === "in_progress"), [allTopics]);
  const weakTopics = useMemo(() => allTopics.filter((t) => t.weak), [allTopics]);

  const avgProgress = useMemo(() => {
    if (subjects.length === 0) return 0;
    return Math.round(
      subjects.reduce((sum, s) => sum + progressOf(s), 0) / subjects.length,
    );
  }, [subjects]);

  // Nearest Exam Computation
  const nearestExamSubject = useMemo(() => {
    const withExams = subjects
      .filter((s) => s.examDate && !Number.isNaN(daysUntil(s.examDate)))
      .map((s) => ({ subject: s, days: daysUntil(s.examDate!) }))
      .filter((item) => item.days >= 0)
      .sort((a, b) => a.days - b.days);

    return withExams.length > 0 ? withExams[0] : null;
  }, [subjects]);

  // Priority Checklist Topics: weak topics first, then in-progress topics
  const priorityActionList = useMemo(() => {
    const list: { subject: Subject; topic: Topic }[] = [];
    for (const sub of subjects) {
      for (const top of sub.topics || []) {
        if (top.weak || top.status === "in_progress") {
          list.push({ subject: sub, topic: top });
        }
      }
    }
    // Sort weak first, then in_progress
    return list.sort((a, b) => {
      if (a.topic.weak && !b.topic.weak) return -1;
      if (!a.topic.weak && b.topic.weak) return 1;
      return 0;
    });
  }, [subjects]);

  // Quick Ask Doubt Handler
  const handleQuickAskDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;

    const targetSubId = selectedSubjectId || (subjects[0] ? subjects[0].id : "");
    if (!targetSubId) {
      toast.error("Please add a subject first before asking doubts.");
      return;
    }

    try {
      setIsAskingDoubt(true);
      await createAndSolveDoubt({
        subjectId: targetSubId,
        questionText: quickQuestion.trim(),
      });
      toast.success("AI resolved your doubt! Redirecting to Doubts tab...");
      setQuickQuestion("");
      router.push("/doubts");
    } catch (err: any) {
      toast.error(err.message || "Failed to solve doubt");
    } finally {
      setIsAskingDoubt(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      {/* 1. Header Greeting & Date */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5 font-medium">
            <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            Study Operations Center
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight text-foreground sm:text-5xl">
            {greeting()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {nearestExamSubject
              ? `Your nearest exam is in ${nearestExamSubject.days} days. Here is your targeted battle plan.`
              : "Review your syllabus velocity, pending priorities, and past papers."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/subjects"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-secondary"
          >
            <Plus className="size-3.5" />
            Add Subject
          </Link>
          <Link
            href="/doubts"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <Sparkles className="size-3.5" />
            Ask AI
          </Link>
        </div>
      </div>

      {/* 2. Urgent Exam Countdown / Next Milestone Banner */}
      {nearestExamSubject ? (
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/30 to-background p-6 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <CalendarClock className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Next Exam Focus
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {examLabel(nearestExamSubject.subject.examDate)}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
                  {nearestExamSubject.subject.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {progressOf(nearestExamSubject.subject)}% syllabus completed ·{" "}
                  {nearestExamSubject.subject.topics.length} topics on syllabus ·{" "}
                  {nearestExamSubject.subject.topics.filter((t) => t.weak).length} flagged as weak
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
              <Link
                href={`/subjects/${nearestExamSubject.subject.id}/doubts`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <MessageSquareText className="size-3.5 text-primary" />
                Solve Doubts
              </Link>
              <Link
                href={`/subjects/${nearestExamSubject.subject.id}/papers`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <FileSearch className="size-3.5 text-primary" />
                Analyze Papers
              </Link>
              <Link
                href="/subjects"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              >
                Study Syllabus
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Readiness Progress</span>
              <span className="text-foreground">{progressOf(nearestExamSubject.subject)}%</span>
            </div>
            <Progress value={progressOf(nearestExamSubject.subject)} className="mt-1.5 h-2" />
          </div>
        </div>
      ) : subjects.length > 0 ? (
        <div className="rounded-3xl border border-border/80 bg-card p-5 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="size-4 text-primary" />
            <span>Set exam dates for your subjects to enable real-time countdown alerts & readiness scheduling.</span>
          </div>
          <Link href="/subjects" className="text-primary font-medium hover:underline">
            Set dates &rarr;
          </Link>
        </div>
      ) : null}

      {/* 3. Primary KPI Performance Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium tracking-wide">Active Subjects</span>
            <BookOpenText className="size-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            {subjects.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across your semester stack</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium tracking-wide">Topics Mastered</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <p className="font-display text-3xl font-bold tracking-tight text-foreground">
              {doneTopics.length}
            </p>
            <span className="text-xs text-muted-foreground">/ {allTopics.length} topics</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {allTopics.length > 0
              ? `${Math.round((doneTopics.length / allTopics.length) * 100)}% total syllabus cleared`
              : "No topics added yet"}
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium tracking-wide">Flagged Weak Spots</span>
            <Star className="size-4 text-amber-500 fill-amber-500/20" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            {weakTopics.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Requires active exam revision</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium tracking-wide">Syllabus Velocity</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            {avgProgress}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Average completion rate</p>
        </div>
      </div>

      {/* 4. Bento Grid Main Section (2 Columns: 65% / 35%) */}
      {subjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Layers className="size-7" />
          </div>
          <h2 className="mt-4 font-display text-3xl text-foreground">Your stack is completely empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Add your subjects and syllabus topics to activate AI doubt resolution, past paper intelligence, and
            countdown tracking.
          </p>
          <Link
            href="/subjects"
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Add First Subject
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
          {/* LEFT COLUMN: Subject Stack & Priority Checklist */}
          <div className="space-y-6 min-w-0">
            {/* Subject Status Cards */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <h2 className="font-display text-xl tracking-tight text-foreground">Syllabus Matrix</h2>
                </div>
                <Link
                  href="/subjects"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Manage all
                  <ArrowRight className="size-3" />
                </Link>
              </div>

              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                {subjects.map((subject) => {
                  const progress = progressOf(subject);
                  const exam = examLabel(subject.examDate);
                  const weakCount = subject.topics ? subject.topics.filter((t) => t.weak).length : 0;

                  return (
                    <div
                      key={subject.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 p-4 transition-all hover:border-primary/50 hover:bg-background"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/subjects/${subject.id}`}
                            className="font-display text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
                          >
                            {subject.name}
                          </Link>
                          {weakCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                              <Star className="size-3 fill-amber-500" />
                              {weakCount}
                            </span>
                          )}
                        </div>

                        {exam ? (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                            <CalendarClock className="size-3" />
                            {exam}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">No exam scheduled</p>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                          <span>{subject.topics?.length || 0} topics</span>
                          <span className="text-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />

                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                          <Link
                            href={`/subjects/${subject.id}/doubts`}
                            className="text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            <MessageSquareText className="size-3" /> Doubts
                          </Link>
                          <Link
                            href={`/subjects/${subject.id}/papers`}
                            className="text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            <FileSearch className="size-3" /> Papers
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Priority & Weak Topics Action Checklist */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border/70">
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    <h2 className="font-display text-xl tracking-tight text-foreground">
                      Today&apos;s Focus &amp; Revision Tasks
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Click any topic pill to toggle its status directly from here.
                  </p>
                </div>

                <Badge variant="outline" className="text-xs">
                  {priorityActionList.length} priorities
                </Badge>
              </div>

              {priorityActionList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto size-7 text-emerald-500 mb-2" />
                  <p className="font-medium text-foreground">No weak or pending topics flagged!</p>
                  <p className="mt-1">Star topics in the Subjects tab to have them queued here for targeted daily revision.</p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-border/60">
                  {priorityActionList.slice(0, 6).map(({ subject, topic }) => {
                    const isDone = topic.status === "done";
                    const isInProgress = topic.status === "in_progress";

                    return (
                      <li
                        key={`${subject.id}-${topic.id}`}
                        className="group flex items-center justify-between py-2.5 transition-colors hover:bg-secondary/40 rounded-xl px-2"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => cycleTopicStatus(subject.id, topic.id)}
                            title="Cycle topic status"
                            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="size-4 text-emerald-500" />
                            ) : isInProgress ? (
                              <Circle className="size-4 text-amber-500 fill-amber-500/20" />
                            ) : (
                              <Circle className="size-4" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <span
                              className={`block truncate text-sm ${
                                isDone ? "text-muted-foreground line-through" : "font-medium text-foreground"
                              }`}
                            >
                              {topic.title}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {subject.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {topic.weak && (
                            <button
                              type="button"
                              onClick={() => toggleTopicWeak(subject.id, topic.id)}
                              className="text-amber-500 hover:opacity-80"
                              title="Starred as weak"
                            >
                              <Star className="size-3.5 fill-current" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => cycleTopicStatus(subject.id, topic.id)}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                              isDone
                                ? "bg-emerald-500/10 text-emerald-600"
                                : isInProgress
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {topic.status === "done"
                              ? "Done"
                              : topic.status === "in_progress"
                                ? "In Progress"
                                : "Not Started"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: AI Assistant Quick Solver & Quick Command Center */}
          <div className="space-y-6 min-w-0">
            {/* Quick Gemini AI Doubt Solver Box */}
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="size-3.5" />
                  </div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                    Quick AI Doubt Solver
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  Gemini Flash
                </Badge>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Stuck on a tricky concept or exam derivation? Ask here for an instant step-by-step breakdown.
              </p>

              <form onSubmit={handleQuickAskDoubt} className="mt-4 space-y-3">
                {subjects.length > 1 && (
                  <div>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative">
                  <Input
                    placeholder="e.g. How does Dijkstra's algorithm work?"
                    value={quickQuestion}
                    onChange={(e) => setQuickQuestion(e.target.value)}
                    disabled={isAskingDoubt}
                    className="rounded-2xl pr-10 text-xs h-10"
                  />
                  <button
                    type="submit"
                    disabled={isAskingDoubt || !quickQuestion.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
                  >
                    <Send className="size-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Photo doubts &amp; full history</span>
                  <Link href="/doubts" className="text-primary font-medium hover:underline">
                    Open Doubts Hub &rarr;
                  </Link>
                </div>
              </form>
            </div>

            {/* Quick Actions & Material Shortcut Bento Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-border/70">
                <Zap className="size-4 text-primary" />
                <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                  Quick Actions
                </h3>
              </div>

              <div className="mt-4 grid gap-2.5">
                <Link
                  href="/materials"
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3 text-xs transition-colors hover:bg-secondary hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Study Materials &amp; Videos</p>
                      <p className="text-[11px] text-muted-foreground">Curated YouTube courses &amp; notes</p>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/papers"
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3 text-xs transition-colors hover:bg-secondary hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                      <FileSearch className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Analyze Previous Year Papers</p>
                      <p className="text-[11px] text-muted-foreground">Identify high-frequency questions</p>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/subjects"
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3 text-xs transition-colors hover:bg-secondary hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Plus className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Add Subject or Topics</p>
                      <p className="text-[11px] text-muted-foreground">Import syllabus from textbook</p>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>

            {/* Study Streak & Pro-Tip Widget */}
            <div className="rounded-3xl border border-border bg-secondary/50 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Flame className="size-4 text-amber-500" />
                <span>Exam Strategy Tip</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Prioritize reviewing past 3-year exam questions before completing optional unit readings.
                High-probability topics account for over 60% of marks in end-semester evaluations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <StudyLayout>
      <BentoDashboardContent />
    </StudyLayout>
  );
}
