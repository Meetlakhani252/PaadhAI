"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/auth-bg.avif')",
      }}
    >
      {/* Contrast Overlay so text and card stand out */}
      <div className="absolute inset-0 bg-background/50 dark:bg-background/70 backdrop-blur-[2px] -z-10" />

      <div className="relative mx-auto flex w-full max-w-6xl items-center px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>

      <main className="relative flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Link href="/" className="wordmark text-2xl inline-flex items-baseline gap-1.5">
              Paadh<span className="mark">AI</span>
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
                  card: "shadow-2xl border border-border/80 bg-card/95 backdrop-blur-md rounded-3xl",
                  primaryButton: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full",
                },
              }}
            />
          </div>
        </div>
      </main>

      <footer className="relative border-t border-border/70 px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PaadhAI
      </footer>
    </div>
  );
}