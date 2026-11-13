"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquareText,
  Send,
  Sparkles,
  LoaderCircle,
  CheckCircle2,
  Bot,
  Globe,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StudyLayout } from "@/components/study-layout";
import { useSubjects } from "@/lib/demo-store";
import { createAndSolveDoubt, getDoubtsBySubject, type DoubtItem } from "@/app/actions/doubts";

function DoubtsContent() {
  const { subjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [question, setQuestion] = useState("");
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [isLoadingDoubts, setIsLoadingDoubts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    if (!selectedSubjectId) return;

    let isMounted = true;
    setIsLoadingDoubts(true);
    getDoubtsBySubject(selectedSubjectId)
      .then((data) => {
        if (isMounted) setDoubts(data);
      })
      .catch(() => {
        if (isMounted) setDoubts([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDoubts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedSubjectId) {
      if (!selectedSubjectId) toast.error("Please select or create a subject first");
      return;
    }

    try {
      setIsSolving(true);
      let imageBase64: string | undefined;
      let mimeType: string | undefined;

      if (imageFile) {
        mimeType = imageFile.type;
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(",")[1]);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(imageFile);
        imageBase64 = await base64Promise;
      }

      const res = await createAndSolveDoubt({
        subjectId: selectedSubjectId,
        questionText: question.trim(),
        imageBase64,
        mimeType,
        enableWebSearch,
      });

      setDoubts((prev) => [res, ...prev]);
      setQuestion("");
      setImageFile(null);
      toast.success(
        res.web_search_used
          ? "AI resolved doubt with live Google Web Grounding!"
          : "Doubt answered by AI!"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to solve doubt");
    } finally {
      setIsSolving(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="eyebrow">Academic Research &amp; Intelligence</p>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 border border-emerald-500/20">
            <Globe className="size-3 animate-spin" />
            Live Google Search RAG
          </span>
        </div>
        <h1 className="mt-1 font-display text-4xl tracking-tight text-foreground">
          Real-Time AI Doubt Solver
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask questions, upload diagrams, or research updated exam patterns. Grounded in real-time internet data and step-by-step reasoning.
        </p>
      </div>

      {/* Subject Filter Bar */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                selectedSubjectId === s.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={handleAsk}
        className="rounded-3xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" />
            <span>Ask a doubt {selectedSubject ? `in ${selectedSubject.name}` : ""}</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={enableWebSearch}
              onChange={(e) => setEnableWebSearch(e.target.checked)}
              className="size-3.5 rounded border-border accent-primary"
            />
            <span className="flex items-center gap-1 text-foreground">
              <Search className="size-3 text-primary" /> Live Web Search (RAG)
            </span>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <Textarea
            rows={3}
            placeholder="e.g. What is the latest release date of Python 3.13, or explain how Dijkstra's algorithm operates with a priority queue step-by-step..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            disabled={isSolving}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setImageFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSolving}
              >
                {imageFile ? `Image: ${imageFile.name}` : "Attach Question Image"}
              </Button>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSolving || !question.trim()}
              className="rounded-full"
            >
              {isSolving ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Searching &amp; Reasoning...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Solve Doubt
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Doubts History List */}
      {isLoadingDoubts ? (
        <div className="flex justify-center py-12">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : doubts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <MessageSquareText className="mx-auto size-8 text-muted-foreground/60" />
          <h2 className="mt-3 font-display text-2xl text-foreground">
            No doubts asked yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Whenever a concept trips you up, ask here to get instant explanations grounded in real-time academic sources.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {doubts.map((doubt) => (
            <li
              key={doubt.id}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  Question
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Date(doubt.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>

              <p className="mt-2 text-base font-semibold text-foreground">
                {doubt.question_text}
              </p>

              {doubt.image_url && (
                <div className="mt-3">
                  <img
                    src={doubt.image_url}
                    alt="Question attachment"
                    className="max-h-60 rounded-xl border border-border object-contain"
                  />
                </div>
              )}

              {doubt.answer_text ? (
                <div className="mt-4 rounded-2xl bg-secondary/70 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Bot className="size-4" />
                      AI Step-by-Step Explanation
                    </div>

                    {doubt.web_search_used && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                        <Globe className="size-2.5" />
                        Grounded with Google Search
                      </span>
                    )}
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {doubt.answer_text}
                  </div>

                  {/* Grounded Citation Sources Pills */}
                  {doubt.sources && doubt.sources.length > 0 && (
                    <div className="pt-3 border-t border-border/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Referenced Web Sources &amp; Citations:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {doubt.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-secondary hover:text-primary"
                          >
                            <ExternalLink className="size-3 text-muted-foreground" />
                            <span className="max-w-[240px] truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-accent p-3 text-xs text-accent-foreground">
                  Generating answer...
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DoubtsPage() {
  return (
    <StudyLayout>
      <DoubtsContent />
    </StudyLayout>
  );
}
