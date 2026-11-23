"use client"

import { cn } from "@/lib/utils"

export function SocialProof({ className }: { className?: string }) {
  return (
    <section className={cn("py-20 border-b border-border/70", className)}>
      <div className="container mx-auto px-6 text-center">
        <p className="eyebrow">Who it&apos;s for</p>
        <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight text-foreground">
          Built for every stream, every semester
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-sm leading-relaxed text-muted-foreground">
          Whether you&apos;re a first-year finding your feet or a final-year racing the clock, PaadhAI
          gives you one calm place to track topics, clear doubts, and decode past papers.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs font-medium">
          {[
            "Engineering",
            "Medical",
            "Law",
            "Commerce",
            "Arts & Humanities",
            "MBA Prep",
            "UPSC / Civil Services",
            "Self-Learners",
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-foreground/80"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
