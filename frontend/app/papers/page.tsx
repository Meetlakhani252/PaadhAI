"use client";

import { useState } from "react";
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

type UploadInfo = { name: string; size: number };
type ExpectedQuestion = { question: string; focus: string; marks: string };
type QuestionSet = {
  id: string;
  subject: string;
  syllabusName: string;
  paperName: string;
  createdAt: string;
  questions: ExpectedQuestion[];
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeQuestions(subject: string): ExpectedQuestion[] {
  return [
    {
      question: `Explain the core principles of ${subject} and show how they apply to a practical problem.`,
      focus: "Core concepts · Application",
      marks: "8 marks",
    },
    {
      question: `Compare two important methods from ${subject}. When would you choose each one?`,
      focus: "Comparison · Use cases",
      marks: "6 marks",
    },
    {
      question: `Work through a typical problem in ${subject}, showing each step and your reasoning.`,
      focus: "Problem solving · Method",
      marks: "10 marks",
    },
    {
      question: `Write short notes on key terms and frequently tested topics in ${subject}.`,
      focus: "Definitions · Revision",
      marks: "5 marks",
    },
    {
      question: `Describe a common challenge in ${subject} and evaluate a suitable solution.`,
      focus: "Analysis · Evaluation",
      marks: "8 marks",
    },
  ];
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
  file: UploadInfo | null;
  onFile: (file: UploadInfo | null) => void;
}) {
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file");
      event.target.value = "";
      return;
    }
    onFile({ name: selected.name, size: selected.size });
  };

  return (
    <div>
      <Label htmlFor={id} className="mb-2 block">{title}</Label>
      <div className="relative flex min-h-28 items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 transition-colors hover:border-primary/50">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          {file ? <FileText className="size-5" /> : <Upload className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{file.size ? formatSize(file.size) : "Saved file name"}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Choose a PDF</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </>
          )}
          <label htmlFor={id} className="mt-2 inline-block cursor-pointer text-xs font-semibold text-primary underline-offset-4 hover:underline">
            {file ? "Replace file" : "Browse files"}
          </label>
        </div>
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onChange}
          className="sr-only"
          aria-label={`Upload ${title} PDF`}
        />
      </div>
    </div>
  );
}

function PapersContent() {
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState<UploadInfo | null>(null);
  const [paper, setPaper] = useState<UploadInfo | null>(null);
  const [questions, setQuestions] = useState<ExpectedQuestion[] | null>(null);
  const [savedSets, setSavedSets] = useState<QuestionSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const activeSet = savedSets.find((set) => set.id === activeSetId);
  const visibleQuestions = activeSet?.questions ?? questions;
  const canGenerate = Boolean(subject.trim() && syllabus && paper && !generating);

  const generateQuestions = () => {
    if (!canGenerate || !syllabus || !paper) return;
    setGenerating(true);
    setActiveSetId(null);
    window.setTimeout(() => {
      setQuestions(makeQuestions(subject.trim()));
      setGenerating(false);
    }, 800);
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
    setSavedSets((previous) => [set, ...previous]);
    setActiveSetId(set.id);
    toast.success("Question set saved");
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
      pdf.text("StudyStack", margin, y);
      y += 12;
      pdf.setFontSize(15);
      pdf.text(`Expected questions: ${title}`, margin, y);
      y += 9;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("AI-generated question set", margin, y);
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

      const filename = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      pdf.save(`${filename || "expected-questions"}.pdf`);
    } catch {
      toast.error("Could not create PDF. Please try again.");
    }
  };

  const removeSet = (id: string) => {
    setSavedSets((previous) => previous.filter((set) => set.id !== id));
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
    setSyllabus({ name: set.syllabusName, size: 0 });
    setPaper({ name: set.paperName, size: 0 });
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="eyebrow">Papers</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">
            Expected questions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bring your syllabus and a past paper together to prepare for your next exam.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5">
          <Sparkles className="size-3.5 text-primary" />
          AI preview
        </Badge>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section aria-labelledby="prepare-heading" className="border-b border-border pb-7">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">1</span>
              <h2 id="prepare-heading" className="font-display text-2xl text-foreground">Add your exam materials</h2>
            </div>

            <div className="mb-5 max-w-sm space-y-2">
              <Label htmlFor="paper-subject">Subject</Label>
              <Input
                id="paper-subject"
                placeholder="e.g. Data Structures"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <UploadField
                id="syllabus-file"
                title="Syllabus"
                description="The topics included in your exam"
                file={syllabus}
                onFile={setSyllabus}
              />
              <UploadField
                id="past-paper-file"
                title="Previous-year paper"
                description="A past paper for this subject"
                file={paper}
                onFile={setPaper}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button onClick={generateQuestions} disabled={!canGenerate} className="gap-2 rounded-full">
                {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Preparing questions…" : "Generate expected questions"}
              </Button>
              <p className="text-xs text-muted-foreground">PDF files only</p>
            </div>
          </section>

          <section aria-labelledby="results-heading" className="pt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">2</span>
                <div>
                  <h2 id="results-heading" className="font-display text-2xl text-foreground">
                    {activeSet ? activeSet.subject : "Your question set"}
                  </h2>
                  {visibleQuestions && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {visibleQuestions.length} questions · Review and save as a PDF
                    </p>
                  )}
                </div>
              </div>
              {visibleQuestions && (
                <div className="flex gap-2">
                  {!activeSet && (
                    <Button variant="outline" size="sm" onClick={saveQuestions} className="gap-1.5 rounded-full">
                      <Bookmark className="size-4" /> Save set
                    </Button>
                  )}
                  <Button size="sm" onClick={() => void downloadPdf(activeSet ?? null)} className="gap-1.5 rounded-full">
                    <Download className="size-4" /> Download PDF
                  </Button>
                </div>
              )}
            </div>

            {visibleQuestions ? (
              <div className="mt-5 divide-y divide-border border-y border-border">
                {visibleQuestions.map((item, index) => (
                  <article key={`${activeSetId ?? "preview"}-${index}`} className="flex gap-4 py-5">
                    <span className="font-display text-2xl leading-none text-primary">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium leading-relaxed text-foreground">{item.question}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{item.focus}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.marks}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-3xl border border-dashed border-border px-6 text-center">
                <FileText className="size-8 text-muted-foreground/50" />
                <p className="mt-3 font-medium text-foreground">Your questions will appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add a subject, syllabus, and past paper to generate a question set.
                </p>
              </div>
            )}

            {visibleQuestions && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                AI-generated expected questions based on your syllabus and past paper analysis.
              </p>
            )}
          </section>
        </div>

        <aside aria-labelledby="saved-heading" className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Your library</p>
              <h2 id="saved-heading" className="mt-1 font-display text-2xl text-foreground">Saved sets</h2>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">{savedSets.length}</span>
          </div>
          {savedSets.length === 0 ? (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Saved question sets will appear here for quick access.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {savedSets.map((set) => (
                <li key={set.id} className="flex items-center gap-2 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => selectSet(set)}
                    className="h-auto min-w-0 flex-1 justify-start px-1 py-1 text-left"
                    aria-label={`Open saved questions for ${set.subject}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{set.subject}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(set.createdAt).toLocaleDateString()} · {set.questions.length} questions
                      </span>
                    </span>
                  </Button>
                  {activeSetId === set.id && <Check className="size-4 shrink-0 text-primary" aria-label="Currently open" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${set.subject} saved set`}
                    onClick={() => removeSet(set.id)}
                    className="size-8 shrink-0 text-muted-foreground"
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

