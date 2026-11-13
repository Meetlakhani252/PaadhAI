"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function SiteHeader({ variant = "landing" }: { variant?: "landing" | "plain" }) {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="wordmark inline-flex items-baseline gap-1.5">
          Paadh<span className="mark">AI</span>
        </Link>

        {variant === "landing" && (
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <Link href={isSignedIn ? "/dashboard" : "/login"} className="transition-colors hover:text-foreground">
              {isSignedIn ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        )}

        <Link
          href={isSignedIn ? "/dashboard" : "/login"}
          className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isSignedIn ? "Go to Dashboard" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}

