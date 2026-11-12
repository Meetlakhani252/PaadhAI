"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, FileSearch, MessageSquareText } from "lucide-react";
import { getSubjectById } from "@/app/actions/subjects";
import { StudyLayout } from "@/components/study-layout";
import type { Subject } from "@/types";

function SubjectDetailContent() {
  const params = useParams<{ subjectId: string }>();
  const subjectId = params.subjectId;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;
    getSubjectById(subjectId)
      .then((data) => setSubject(data))
      .catch(() => setSubject(null))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl animate-pulse space-y-6">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-10 w-64 rounded-xl bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-44 rounded-3xl border border-border bg-card" />
          <div className="h-44 rounded-3xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="mx-auto w-full max-w-3xl text-center py-20">
        <h2 className="font-display text-2xl text-foreground">Subject not found</h2>
        <Link href="/subjects" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" />
          Back to subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/subjects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All subjects
      </Link>

      <div className="mt-6">
        <p className="eyebrow">Subject</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">{subject.name}</h1>
        {subject.exam_date && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
            <CalendarClock className="size-4" />
            Exam: {subject.exam_date}
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Link
          href={`/subjects/${subject.id}/doubts`}
          className="group flex flex-col rounded-3xl border border-border bg-card p-7 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquareText className="size-5 text-primary" />
            </div>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <h2 className="mt-5 font-display text-2xl tracking-tight text-foreground">AI Doubt Solver</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ask questions with text or photos to get step-by-step explanations powered by Gemini AI.
          </p>
        </Link>

        <Link
          href={`/subjects/${subject.id}/papers`}
          className="group flex flex-col rounded-3xl border border-border bg-card p-7 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
              <FileSearch className="size-5 text-primary" />
            </div>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <h2 className="mt-5 font-display text-2xl tracking-tight text-foreground">Past Papers</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Upload and analyze previous-year papers to find high-frequency exam topics.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default function SubjectDetailPage() {
  return (
    <StudyLayout>
      <SubjectDetailContent />
    </StudyLayout>
  );
}
