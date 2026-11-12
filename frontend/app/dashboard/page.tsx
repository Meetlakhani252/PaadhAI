"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarClock, Flag } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { StudyLayout } from "@/components/study-layout";
import {
  examLabel,
  progressOf,
  useSubjects,
  type Subject,
} from "@/lib/demo-store";
import { useProfile } from "@/lib/profile";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night session";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="font-display text-3xl leading-none text-foreground">{value}</p>
      <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  const progress = progressOf(subject);
  const exam = examLabel(subject.examDate);
  const weakCount = subject.topics ? subject.topics.filter((t) => t.weak).length : 0;

  return (
    <Link
      href="/subjects"
      className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl tracking-tight text-foreground">
            {subject.name}
          </h3>
          {exam && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <CalendarClock className="size-3.5" />
              {exam}
            </p>
          )}
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Progress value={progress} className="h-1.5" />
        <span className="w-9 shrink-0 text-right text-xs font-semibold text-foreground">
          {progress}%
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpenText className="size-3.5" />
          {subject.topics?.length || 0} topics
        </span>
        {weakCount > 0 && (
          <span className="flex items-center gap-1.5 text-accent-foreground">
            <Flag className="size-3.5" />
            {weakCount} weak
          </span>
        )}
      </div>
    </Link>
  );
}

function DashboardContent() {
  const { profile } = useProfile();
  const { subjects } = useSubjects();

  const firstName = profile.name.trim().split(/\s+/)[0];
  const allTopics = subjects.flatMap((s) => s.topics || []);
  const doneTopics = allTopics.filter((t) => t.status === "done").length;
  const weakTopics = allTopics.filter((t) => t.weak).length;
  const avgProgress =
    subjects.length === 0
      ? 0
      : Math.round(
          subjects.reduce((sum, s) => sum + progressOf(s), 0) / subjects.length,
        );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="eyebrow">Home</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
        {greeting()}
        {firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Here&apos;s where your syllabus stands today.
      </p>

      {subjects.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-display text-2xl text-foreground">
            Your stack is empty
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Add your first subject and its topics to start tracking progress,
            exam dates, and weak areas.
          </p>
          <Link
            href="/subjects"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add a subject
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Subjects" value={subjects.length} />
            <Stat label="Topics done" value={`${doneTopics}/${allTopics.length}`} />
            <Stat label="Weak topics" value={weakTopics} />
            <Stat label="Avg. progress" value={`${avgProgress}%`} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <StudyLayout>
      <DashboardContent />
    </StudyLayout>
  );
}
