"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Link href="/" className="wordmark text-2xl inline-flex items-baseline gap-1.5">
              Study<span className="mark">Stack</span>
            </Link>
            <h1 className="mt-6 font-display text-3xl tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to pick up where you left off.
            </p>
          </div>

          <div className="flex justify-center">
            <SignIn
              routing="hash"
              signUpUrl="/signup"
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  card: "shadow-none border border-border bg-card rounded-3xl",
                  primaryButton: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full",
                },
              }}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/70 px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} StudyStack
      </footer>
    </div>
  );
}
