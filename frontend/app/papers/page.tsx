"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  Check,
  Download,
  FileText,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudyLayout } from "@/components/study-layout";
import { useSubjects } from "@/lib/demo-store";
import {
  generateExpectedQuestionsAI,
  type ExpectedQuestionAI,
} from "@/app/actions/expected-questions";

type UploadedPdf = {
  name: string;
  size: number;
  base64: string;
};

type QuestionSet = {
  id: string;
  subject: string;
  syllabusName: string;
  paperName: string;
  createdAt: string;
  questions: ExpectedQuestionAI[];
};

const STORAGE_KEY = "studystack.expected-questions.v1";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadField({
  id,
  title,
  description,
  file,
  onFile,
}: {
  id: string;
  title: string;
  description: string;
  file: UploadedPdf | null;
  onFile: (file: UploadedPdf | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (
      selected.type !== "application/pdf" &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Please choose a valid PDF file.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.includes(",") ? result.split(",")[1] : result;
      onFile({
        name: selected.name,
        size: selected.size,
        base64: base64Data,
      });
      toast.success(`${title} uploaded: ${selected.name}`);
    };
    reader.onerror = () => {
      toast.error("Failed to read the file. Please try again.");
    };
    reader.readAsDataURL(selected);
  };

  return (
    <div>
      <Label htmlFor={id} className="mb-2 block font-medium">
        {title}
      </Label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative flex min-h-28 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 transition-all hover:border-primary/60 hover:bg-secondary/40"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          {file ? <FileText className="size-5" /> : <Upload className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-semibold text-foreground">
                {file.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {file.size ? formatSize(file.size) : "Ready for AI analysis"}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Click to upload PDF</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </>
          )}
          <span className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline">
            {file ? "Replace document" : "Browse computer files"}
          </span>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onChange}
          className="hidden"
          aria-label={`Upload ${title} PDF`}
        />
      </div>
    </div>
  );
}

function PapersContent() {
  const { subjects } = useSubjects();
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState<UploadedPdf | null>(null);
  const [paper, setPaper] = useState<UploadedPdf | null>(null);
  const [questions, setQuestions] = useState<ExpectedQuestionAI[] | null>(null);
  const [savedSets, setSavedSets] = useState<QuestionSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Load saved sets from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSavedSets(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToStorage = (updated: QuestionSet[]) => {
    setSavedSets(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const activeSet = savedSets.find((set) => set.id === activeSetId);
  const visibleQuestions = activeSet?.questions ?? questions;
  const canGenerate = Boolean(subject.trim() && syllabus && paper && !generating);

  const generateQuestions = async () => {
    if (!subject.trim()) {
      toast.error("Please enter or select a Subject name.");
      return;
    }
    if (!syllabus || !paper) {
      toast.error("Please upload both the Syllabus and Past Paper PDFs.");
      return;
    }

    try {
      setGenerating(true);
      setActiveSetId(null);
      setQuestions(null);

      const generated = await generateExpectedQuestionsAI({
        subject: subject.trim(),
        syllabusBase64: syllabus.base64,
        paperBase64: paper.base64,
      });

      setQuestions(generated);
      toast.success(
        `AI generated ${generated.length} high-yield expected questions!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const saveQuestions = () => {
    if (!questions || !syllabus || !paper || !subject.trim()) return;
    const set: QuestionSet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subject: subject.trim(),
      syllabusName: syllabus.name,
      paperName: paper.name,
      createdAt: new Date().toISOString(),
      questions,
    };
    const updated = [set, ...savedSets];
    saveToStorage(updated);
    setActiveSetId(set.id);
    toast.success("Question set saved to your library");
  };

  const downloadPdf = async (set: QuestionSet | null) => {
    const title = set?.subject ?? subject.trim();
    const items = set?.questions ?? questions;
    if (!items || !title) return;

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      const margin = 18;
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 22;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("PaadhAI", margin, y);
      y += 12;
      pdf.setFontSize(15);
      pdf.text(`Predicted Exam Questions: ${title}`, margin, y);
      y += 9;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("AI-generated exam forecast based on Syllabus and PYQ analysis", margin, y);
      y += 12;

      items.forEach((item, index) => {
        const lines = pdf.splitTextToSize(item.question, pageWidth - margin * 2);
        const blockHeight = lines.length * 6 + 15;
        if (y + blockHeight > 278) {
          pdf.addPage();
          y = 22;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${index + 1}. ${lines[0] ?? ""}`, margin, y);
        if (lines.length > 1) {
          pdf.setFont("helvetica", "normal");
          pdf.text(lines.slice(1), margin + 5, y + 6);
        }
        y += lines.length * 6 + 3;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`${item.focus}  ·  ${item.marks}`, margin + 5, y);
        y += 12;
      });

      const filename = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      pdf.save(`${filename || "expected-questions"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch {
      toast.error("Could not create PDF. Please try again.");
    }
  };

  const removeSet = (id: string) => {
    const updated = savedSets.filter((set) => set.id !== id);
    saveToStorage(updated);
    if (activeSetId === id) {
      setActiveSetId(null);
      setQuestions(null);
    }
    toast.success("Saved set removed");
  };

  const selectSet = (set: QuestionSet) => {
    setActiveSetId(set.id);
    setQuestions(null);
    setSubject(set.subject);
    setSyllabus({ name: set.syllabusName, size: 0, base64: "" });
    setPaper({ name: set.paperName, size: 0, base64: "" });
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="eyebrow">Papers &amp; Forecasts</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">
            Expected Questions Forecast
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Upload your syllabus and previous-year question papers. Gemini AI cross-references the documents to forecast the highest-probability questions for your upcoming exam.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5 font-semibold text-primary border-primary/30 bg-primary/5">
          <Sparkles className="size-3.5 text-primary" />
          AI Exam Forecast Active
        </Badge>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section aria-labelledby="prepare-heading" className="border-b border-border pb-7">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                1
              </span>
              <h2 id="prepare-heading" className="font-display text-2xl text-foreground">
                Upload Exam Materials
              </h2>
            </div>

            <div className="mb-5 max-w-md space-y-2">
              <Label htmlFor="paper-subject">Subject</Label>
              <Input
                id="paper-subject"
                placeholder="e.g. Data Structures or choose below..."
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />

              {subjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground">Quick select:</span>
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubject(s.name)}
                      className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <UploadField
                id="syllabus-file"
                title="1. Syllabus PDF"
                description="Your complete semester topic outline"
                file={syllabus}
                onFile={setSyllabus}
              />
              <UploadField
                id="past-paper-file"
                title="2. Past Exam Paper PDF"
                description="Previous-year exam paper with questions"
                file={paper}
                onFile={setPaper}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button
                onClick={generateQuestions}
                disabled={!canGenerate}
                className="gap-2 rounded-full px-6 py-2.5 shadow-sm"
              >
                {generating ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {generating
                  ? "Analyzing PDFs with AI…"
                  : "Generate Expected Questions"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {!subject.trim()
                  ? "Enter a subject to begin."
                  : !syllabus || !paper
                  ? "Upload both Syllabus and Paper PDFs to enable AI generation."
                  : "Ready! Click to run the Gemini AI analysis."}
              </p>
            </div>
          </section>

          <section aria-labelledby="results-heading" className="pt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  2
                </span>
                <div>
                  <h2 id="results-heading" className="font-display text-2xl text-foreground">
                    {activeSet ? activeSet.subject : "Forecasted Questions"}
                  </h2>
                  {visibleQuestions && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {visibleQuestions.length} high-probability questions predicted by AI
                    </p>
                  )}
                </div>
              </div>
              {visibleQuestions && (
                <div className="flex gap-2">
                  {!activeSet && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveQuestions}
                      className="gap-1.5 rounded-full"
                    >
                      <Bookmark className="size-4" /> Save to Library
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => void downloadPdf(activeSet ?? null)}
                    className="gap-1.5 rounded-full"
                  >
                    <Download className="size-4" /> Export as PDF
                  </Button>
                </div>
              )}
            </div>

            {generating ? (
              <div className="mt-6 flex min-h-60 flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center bg-card">
                <LoaderCircle className="size-8 animate-spin text-primary" />
                <p className="mt-4 font-display text-xl text-foreground">
                  Reading Syllabus &amp; Past Paper...
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Gemini AI is identifying recurring topics, question weights, and predicting exam questions.
                </p>
              </div>
            ) : visibleQuestions ? (
              <div className="mt-5 divide-y divide-border border-y border-border">
                {visibleQuestions.map((item, index) => (
                  <article
                    key={`${activeSetId ?? "preview"}-${index}`}
                    className="flex gap-4 py-5"
                  >
                    <span className="font-display text-2xl leading-none text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-medium leading-relaxed text-foreground">
                        {item.question}
                      </h3>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
                          {item.focus}
                        </span>
                        <span className="font-semibold text-primary">
                          {item.marks}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-3xl border border-dashed border-border px-6 text-center bg-card">
                <FileText className="size-8 text-muted-foreground/50" />
                <p className="mt-3 font-semibold text-foreground">
                  Your predicted questions will appear here
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Upload both PDFs above and click &quot;Generate Expected Questions&quot; to run the forecast.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside aria-labelledby="saved-heading" className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Saved Library</p>
              <h2 id="saved-heading" className="mt-1 font-display text-2xl text-foreground">
                Saved Sets
              </h2>
            </div>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {savedSets.length}
            </span>
          </div>

          {savedSets.length === 0 ? (
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Generated prediction sets that you save will appear here for fast access and PDF re-downloading.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {savedSets.map((set) => (
                <li key={set.id} className="flex items-center gap-2 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => selectSet(set)}
                    className="h-auto min-w-0 flex-1 justify-start px-2 py-1.5 text-left"
                    aria-label={`Open saved questions for ${set.subject}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {set.subject}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(set.createdAt).toLocaleDateString()} · {set.questions.length} questions
                      </span>
                    </span>
                  </Button>
                  {activeSetId === set.id && (
                    <Check className="size-4 shrink-0 text-primary" aria-label="Currently open" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${set.subject} saved set`}
                    onClick={() => removeSet(set.id)}
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function PapersPage() {
  return (
    <StudyLayout>
      <PapersContent />
    </StudyLayout>
  );
}
