import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
        <Link href="/" className="wordmark text-base inline-flex items-baseline gap-1.5">
          Study<span className="mark">Stack</span>
        </Link>
        <p className="text-center text-xs">
          Syllabus tracking · AI doubt resolution · Previous-year paper analysis
        </p>
        <div className="flex items-center gap-6">
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <span className="text-xs">© {new Date().getFullYear()} StudyStack</span>
        </div>
      </div>
    </footer>
  );
}

