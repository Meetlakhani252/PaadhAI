"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquareText, Send, Sparkles, LoaderCircle, CheckCircle2, Bot } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudyLayout } from "@/components/study-layout";
import { useSubjects } from "@/lib/demo-store";
import { createAndSolveDoubt, getDoubtsBySubject, type DoubtItem } from "@/app/actions/doubts";

function DoubtsContent() {
  const { subjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [question, setQuestion] = useState("");
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
      });

      setDoubts((prev) => [res, ...prev]);
      setQuestion("");
      setImageFile(null);
      toast.success("Doubt answered by AI!");
    } catch (err: any) {
      toast.error(err.message || "Failed to solve doubt");
    } finally {
      setIsSolving(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="eyebrow">Doubts</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
        AI Doubt Solver
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask anything you&apos;re stuck on. Powered by Gemini AI with step-by-step reasoning.
      </p>

      {subjects.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                selectedSubjectId === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleAsk}
        className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          <span>Ask a doubt {selectedSubject ? `in ${selectedSubject.name}` : ""}</span>
        </div>

        <div className="mt-4 space-y-3">
          <Textarea
            rows={3}
            placeholder="e.g. Why does quicksort degrade to O(n²) on sorted input? Or paste a math derivation problem..."
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
                  Solving with AI...
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

      {isLoadingDoubts ? (
        <div className="mt-8 flex justify-center py-10">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : doubts.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <MessageSquareText className="mx-auto size-8 text-muted-foreground/60" />
          <h2 className="mt-3 font-display text-2xl text-foreground">
            No doubts asked yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Whenever a concept trips you up, ask here to get instant explanations saved to your syllabus.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
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

              <p className="mt-2 text-base font-medium text-foreground">
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
                <div className="mt-4 rounded-2xl bg-secondary/70 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Bot className="size-4" />
                    AI Explanation
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {doubt.answer_text}
                  </div>
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

