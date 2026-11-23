"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Sparkles,
  Send,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
  User,
  AlertCircle,
  BookOpen,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  TrendingUp,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { StudyLayout } from "@/components/study-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface SourceItem {
  chunk_id: number;
  document_id: number;
  document_title: string;
  distance?: number;
}

interface ChatMessage {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
  source_chunk_ids?: number[];
  created_at?: string;
  isLoading?: boolean;
}

interface DocumentItem {
  id: number;
  title: string;
  created_at: string;
  chunk_count: number;
}

interface ProgressItem {
  topic: string;
  mastery_score: number;
  last_revised: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

function TutorContent() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string | number, boolean>>({});

  // Side panels state
  const [activeSidePanel, setActiveSidePanel] = useState<"materials" | "mastery" | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  // Progress state
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth fetch helper
  const authFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const token = await getToken();
      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { "X-User-Id": userId } : {}),
          ...options.headers,
        },
      });
    },
    [getToken, userId]
  );

  // 1. Fetch Chat History
  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await authFetch("/tutor/history");
      if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to load chat history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authFetch, userId]);

  // 2. Fetch User Documents
  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    setIsLoadingDocuments(true);
    setDocumentsError(null);
    try {
      const res = await authFetch("/tutor/documents");
      if (!res.ok) throw new Error(`Failed to load materials (${res.status})`);
      const data: DocumentItem[] = await res.json();
      setDocuments(data);
    } catch (err: any) {
      setDocumentsError(err.message || "Failed to load study materials");
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [authFetch, userId]);

  // 3. Fetch Student Progress
  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    setIsLoadingProgress(true);
    setProgressError(null);
    try {
      const res = await authFetch("/tutor/progress");
      if (!res.ok) throw new Error(`Failed to load progress (${res.status})`);
      const data: ProgressItem[] = await res.json();
      setProgress(data);
    } catch (err: any) {
      setProgressError(err.message || "Failed to load topic progress");
    } finally {
      setIsLoadingProgress(false);
    }
  }, [authFetch, userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchHistory();
      fetchDocuments();
      fetchProgress();
    }
  }, [userId, fetchHistory, fetchDocuments, fetchProgress]);

  // Clear Chat History
  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      const res = await authFetch("/tutor/history", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear chat history");
      setMessages([]);
      setIsConfirmingClear(false);
      toast.success("Chat history cleared.");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear history");
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: number, title: string) => {
    setDeletingDocId(docId);
    try {
      const res = await authFetch(`/tutor/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success(`Deleted "${title}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  // Upload Document
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF document.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading and indexing "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const response = await authFetch("/tutor/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to index PDF document");
      }

      toast.success(
        `Indexed "${file.name}" (${data.chunk_count} chunks ready)`,
        { id: toastId }
      );
      // Refresh documents list
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput("");
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: query },
      { id: assistantMessageId, role: "assistant", content: "", isLoading: true },
    ]);

    setIsStreaming(true);

    try {
      const response = await authFetch("/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, k: 5 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to establish streaming response.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          for (const line of block.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const raw = trimmed.slice(6).trim();
            if (raw === "[DONE]") continue;

            try {
              const payload = JSON.parse(raw);
              if (payload.type === "metadata") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          sources: payload.sources || [],
                          source_chunk_ids: payload.source_chunk_ids || [],
                        }
                      : msg
                  )
                );
              } else if (payload.type === "delta") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: msg.content + (payload.text || ""),
                          isLoading: false,
                        }
                      : msg
                  )
                );
              } else if (payload.type === "progress") {
                toast.success(
                  `Mastery Updated: ${payload.topic} (${payload.grade}) -> ${payload.mastery_score}%`,
                  { description: payload.feedback || undefined }
                );
                // Refresh progress panel
                fetchProgress();
              } else if (payload.type === "done") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          isLoading: false,
                          source_chunk_ids: payload.source_chunk_ids || msg.source_chunk_ids,
                        }
                      : msg
                  )
                );
              } else if (payload.type === "error") {
                toast.error(payload.detail || "Error generating response");
              }
            } catch (jsonErr) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate tutor response");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  msg.content ||
                  "An error occurred while connecting to the tutor. Please try again.",
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, isLoading: false } : msg
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleSources = (msgId: string | number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Helper for progress bar color thresholds: red < 40, amber 40-70, green > 70
  const getMasteryColor = (score: number) => {
    if (score < 40) return { bar: "bg-red-500", text: "text-red-500", label: "Needs Work" };
    if (score <= 70) return { bar: "bg-amber-500", text: "text-amber-500", label: "Developing" };
    return { bar: "bg-emerald-500", text: "text-emerald-500", label: "Mastered" };
  };

  const renderSidePanelContent = () => {
    if (activeSidePanel === "materials") {
      if (isLoadingDocuments) {
        return (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-xs">Loading documents...</p>
          </div>
        );
      }
      if (documentsError) {
        return (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2">
            <p>{documentsError}</p>
            <Button onClick={fetchDocuments} variant="outline" size="sm" className="h-7 text-xs w-full">
              Retry
            </Button>
          </div>
        );
      }
      if (documents.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground px-2">
            <FolderGit2 className="size-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-medium text-foreground">No materials uploaded</p>
            <p className="text-[11px] mt-1">Upload a PDF to ground tutor answers in your notes.</p>
          </div>
        );
      }
      return documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary/60 transition-colors"
        >
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-foreground truncate" title={doc.title}>
              {doc.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {doc.chunk_count} chunks
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <Button
            onClick={() => handleDeleteDocument(doc.id, doc.title)}
            disabled={deletingDocId === doc.id}
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive shrink-0"
            title="Delete document"
          >
            {deletingDocId === doc.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ));
    }

    if (activeSidePanel === "mastery") {
      if (isLoadingProgress) {
        return (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-xs">Loading progress...</p>
          </div>
        );
      }
      if (progressError) {
        return (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2">
            <p>{progressError}</p>
            <Button onClick={fetchProgress} variant="outline" size="sm" className="h-7 text-xs w-full">
              Retry
            </Button>
          </div>
        );
      }
      if (progress.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground px-2">
            <TrendingUp className="size-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-medium text-foreground">No topic progress yet</p>
            <p className="text-[11px] mt-1">
              Answer check questions in your tutor chat to track mastery per syllabus topic.
            </p>
          </div>
        );
      }
      return progress.map((prog, idx) => {
        const colors = getMasteryColor(prog.mastery_score);
        return (
          <div
            key={idx}
            className="p-3 rounded-xl border border-border/80 bg-secondary/30 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground truncate max-w-[140px]" title={prog.topic}>
                {prog.topic}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-bold ${colors.text}`}>
                  {prog.mastery_score}%
                </span>
                <span className="text-[9px] text-muted-foreground">({colors.label})</span>
              </div>
            </div>

            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${colors.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, prog.mastery_score))}%` }}
              />
            </div>

            <p className="text-[10px] text-muted-foreground text-right">
              Revised {new Date(prog.last_revised).toLocaleDateString()}
            </p>
          </div>
        );
      });
    }

    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] max-w-7xl mx-auto gap-4">
      {/* Main Chat Column */}
      <div className="flex flex-col flex-1 h-full min-w-0 space-y-4">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>RAG Personal Tutor</span>
            </div>
            <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              PaadhAI Tutor
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Answers strictly from your uploaded materials and tracks topic mastery.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <>
                {isConfirmingClear ? (
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={handleClearHistory}
                      disabled={isClearingHistory}
                      variant="destructive"
                      size="sm"
                      className="rounded-full text-xs h-8"
                    >
                      {isClearingHistory ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : null}
                      Confirm Clear?
                    </Button>
                    <Button
                      onClick={() => setIsConfirmingClear(false)}
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs h-8"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsConfirmingClear(true)}
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs text-muted-foreground hover:text-destructive h-8 gap-1.5"
                    title="Clear chat history"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline">Clear Chat</span>
                  </Button>
                )}
              </>
            )}

            {/* Toggle Materials Panel */}
            <Button
              onClick={() =>
                setActiveSidePanel((prev) => (prev === "materials" ? null : "materials"))
              }
              variant={activeSidePanel === "materials" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <FolderGit2 className="size-3.5" />
              <span>Materials</span>
              {documents.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {documents.length}
                </Badge>
              )}
            </Button>

            {/* Toggle Mastery Panel */}
            <Button
              onClick={() =>
                setActiveSidePanel((prev) => (prev === "mastery" ? null : "mastery"))
              }
              variant={activeSidePanel === "mastery" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <TrendingUp className="size-3.5" />
              <span>Mastery</span>
              {progress.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {progress.length}
                </Badge>
              )}
            </Button>

            {/* Upload PDF */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="tutor-pdf-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              className="rounded-full gap-1.5 text-xs h-8"
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              <span>{isUploading ? "Indexing..." : "Upload PDF"}</span>
            </Button>
          </div>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 rounded-2xl">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Loading conversation history...</p>
            </div>
          ) : historyError ? (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4" />
                <span>{historyError}</span>
              </div>
              <Button onClick={fetchHistory} variant="ghost" size="sm" className="h-7 text-xs">
                Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Bot className="size-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Welcome to your Personal AI Tutor
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Upload your syllabus or study notes PDF above, then ask any question. Answers are
                grounded strictly in your material.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg w-full text-left">
                {[
                  "What are the main topics in my uploaded syllabus?",
                  "Explain the core concept in simple terms.",
                  "Give me a check question to test my understanding.",
                  "Summarize the key exam formulas.",
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="p-3 text-xs rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="size-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="size-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm shadow-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-card border border-border/80 text-foreground"
                  }`}
                >
                  {/* Message Body */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.isLoading && (
                      <span className="inline-flex items-center gap-1 ml-1 text-muted-foreground animate-pulse">
                        <span className="size-1.5 rounded-full bg-current" />
                        <span className="size-1.5 rounded-full bg-current" />
                        <span className="size-1.5 rounded-full bg-current" />
                      </span>
                    )}
                  </div>

                  {/* Collapsible Sources Section */}
                  {msg.role === "assistant" &&
                    ((msg.sources && msg.sources.length > 0) ||
                      (msg.source_chunk_ids && msg.source_chunk_ids.length > 0)) && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <button
                          onClick={() => toggleSources(msg.id || index)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus:outline-none"
                        >
                          <BookOpen className="size-3.5" />
                          <span>
                            Study Material Sources (
                            {msg.sources?.length || msg.source_chunk_ids?.length || 0})
                          </span>
                          {expandedSources[msg.id || index] ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </button>

                        {expandedSources[msg.id || index] && (
                          <div className="mt-2 space-y-1.5">
                            {msg.sources && msg.sources.length > 0
                              ? msg.sources.map((src, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/50 border border-border/50"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="size-3.5 text-primary shrink-0" />
                                      <span className="font-medium truncate text-foreground">
                                        {src.document_title}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        Chunk #{src.chunk_id}
                                      </Badge>
                                    </div>
                                    {src.distance !== undefined && (
                                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                                        {`${((1 - src.distance) * 100).toFixed(0)}% match`}
                                      </span>
                                    )}
                                  </div>
                                ))
                              : msg.source_chunk_ids?.map((cid, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="flex items-center gap-2 text-xs p-2 rounded-lg bg-secondary/50 border border-border/50"
                                  >
                                    <FileText className="size-3.5 text-primary shrink-0" />
                                    <span className="text-muted-foreground">Source Chunk #{cid}</span>
                                  </div>
                                ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {msg.role === "user" && (
                  <div className="size-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-1">
                    <User className="size-4 text-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSendMessage}
          className="rounded-2xl border border-border bg-card p-3 shadow-md"
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question from your study material... (Press Enter to send)"
              rows={2}
              className="min-h-[52px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-2 text-sm"
            />

            <div className="flex items-center gap-1.5 pb-1 pr-1 shrink-0">
              <Button
                type="submit"
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="size-9 rounded-xl shadow-xs"
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Side Drawer / Panel (My Materials & Mastery) */}
      {activeSidePanel && (
        <aside className="w-full lg:w-80 shrink-0 border border-border bg-card rounded-3xl p-5 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              {activeSidePanel === "materials" ? (
                <>
                  <FolderGit2 className="size-4 text-primary" />
                  <span>My Materials</span>
                </>
              ) : (
                <>
                  <TrendingUp className="size-4 text-primary" />
                  <span>Topic Mastery</span>
                </>
              )}
            </div>

            <Button
              onClick={() => setActiveSidePanel(null)}
              variant="ghost"
              size="icon"
              className="size-7 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close panel</span>
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto pt-4 space-y-3">
            {renderSidePanelContent()}
          </div>
        </aside>
      )}
    </div>
  );
}

export default function TutorPage() {
  return (
    <StudyLayout>
      <TutorContent />
    </StudyLayout>
  );
}
