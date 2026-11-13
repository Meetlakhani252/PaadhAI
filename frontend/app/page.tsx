"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  BookOpenCheck,
  MessageSquareText,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const FEATURES = [
  {
    number: "01",
    icon: BookOpenCheck,
    title: "Syllabus tracker",
    body: "Break any subject into topics, mark each one Not Started, In Progress, or Done, and watch a clear progress percentage build up. Flag weak topics so revision time goes where it matters.",
  },
  {
    number: "02",
    icon: MessageSquareText,
    title: "AI doubt solver",
    body: "Type a doubt or upload a photo of a printed question. Get a step-by-step explanation, with every question and answer saved to the subject so you can revisit how you got unstuck.",
  },
  {
    number: "03",
    icon: FileSearch,
    title: "Paper analyzer",
    body: "Upload previous-year papers as PDFs. PaadhAI splits them into questions, matches each one to your syllabus topics, and ranks what keeps getting asked — so you know what to prioritize.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Add your subject",
    body: "Name the subject, set an exam date if you have one, and paste in your topics — it takes under two minutes.",
  },
  {
    step: "2",
    title: "Track as you study",
    body: "Move topics through Not Started, In Progress, and Done. Your progress updates with every tick.",
  },
  {
    step: "3",
    title: "Ask and analyze",
    body: "Resolve doubts with AI as they come up, then upload past papers to see which topics deserve the most attention.",
  },
] as const;

function HeroMock() {
  const subjects = [
    { name: "Data Structures", meta: "12 topics · exam in 21 days", pct: 68 },
    { name: "Thermodynamics", meta: "9 topics · exam in 34 days", pct: 41 },
    { name: "Macroeconomics", meta: "15 topics · no exam date", pct: 12 },
  ] as const;

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-32px_oklch(0.47_0.088_252/0.35)]">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Your semester
      </p>
      <div className="mt-5 space-y-5">
        {subjects.map((s) => (
          <div key={s.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.pct}%</p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{s.meta}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-accent p-4">
        <p className="text-xs font-medium text-accent-foreground">
          Most repeated topic this year
        </p>
        <p className="mt-1 font-display text-lg leading-snug text-foreground">
          Binary trees &amp; traversals — appeared in 3 of the last 4 papers
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const ctaLink = isSignedIn ? "/dashboard" : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border/70">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.15fr_1fr] md:items-center md:py-28">
          <div>
            <p className="eyebrow">For every stream, one stack</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Know what to study.
              <br />
              Get unstuck.
              <br />
              <span className="italic text-primary">Beat the paper.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              PaadhAI is a subject-agnostic workspace for college students:
              track your syllabus topic by topic, resolve doubts with AI, and see
              which topics your exams keep repeating.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={ctaLink}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {isSignedIn ? "Go to Dashboard" : "Get started"}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-7 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                See what&apos;s inside
              </a>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border/70">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">What&apos;s inside</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl leading-tight tracking-tight text-foreground">
            Three tools that answer one question: what should I do next?
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.number} className="flex flex-col bg-card p-8">
                <div className="flex items-start justify-between">
                  <f.icon className="size-5 text-primary" strokeWidth={1.75} />
                  <span className="feature-number">{f.number}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border/70 bg-secondary/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl leading-tight tracking-tight text-foreground">
            From a blank semester to a plan, in three steps
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="border-t border-border pt-6">
                <p className="font-display text-3xl text-primary">{s.step}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-3xl bg-primary px-8 py-16 text-center sm:px-16">
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight tracking-tight text-primary-foreground">
              Your syllabus, your doubts, your past papers — one calm place
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
              Sign in to start your first subject. Adding a topic takes less than
              two minutes.
            </p>
            <Link
              href={ctaLink}
              className="mt-9 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-foreground px-7 text-sm font-medium text-primary transition-opacity hover:opacity-90"
            >
              {isSignedIn ? "Open Dashboard" : "Sign in to StudyStack"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
