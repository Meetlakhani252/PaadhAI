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
  Plus,
  Clock,
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
  const [activeSidePanel, setActiveSidePanel] = useState<"materials" | "mastery" | "history" | null>(null);

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

  // Helper to render side panel content
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
            <FileText className="size-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-medium text-foreground">No documents uploaded yet</p>
            <p className="text-[11px] mt-1">
              Upload PDFs here to use them as sources for your tutor chat.
            </p>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span className="text-sm truncate max-w-[180px]" title={doc.title}>
                  {doc.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setDeletingDocId(doc.id);
                  try {
                    const res = await authFetch(`/tutor/documents/${doc.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Failed to delete");
                    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                    toast.success("Document deleted");
                  } catch (e: any) {
                    toast.error(e.message || "Delete failed");
                  } finally {
                    setDeletingDocId(null);
                  }
                }}
                disabled={isUploading || deletingDocId === doc.id}
                className="text-muted-foreground hover:text-destructive"
              >
                {deletingDocId === doc.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </div>
          ))}
        </div>
      );
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
                <span className={`text-[10px] font-bold ${colors.text}`}>{prog.mastery_score}%</span>
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

    if (activeSidePanel === "history") {
      if (isLoadingHistory) {
        return (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-xs">Loading history...</p>
          </div>
        );
      }
      if (historyError) {
        return (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2">
            <p>{historyError}</p>
            <Button onClick={fetchHistory} variant="outline" size="sm" className="h-7 text-xs w-full">
              Retry
            </Button>
          </div>
        );
      }
      if (messages.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground px-2">
            <Clock className="size-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-medium text-foreground">No chat history yet</p>
            <p className="text-[11px] mt-1">Start a new chat to see messages appear here.</p>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm shadow-xs ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-card border border-border/80 text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // UI event handlers (new chat, file upload, send message, etc.) are assumed to exist elsewhere.

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
            {/* New Chat Button */}
            {messages.length > 0 && (
              <Button
                onClick={handleNewChat}
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8 gap-1.5 border-border/80 hover:bg-secondary"
                title="Start a new chat session"
              >
                <Plus className="size-3.5 text-primary" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            )}

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
                      {isClearingHistory ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
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
              onClick={() => setActiveSidePanel((prev) => (prev === "materials" ? null : "materials"))}
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

            {/* Toggle History Panel */}
            <Button
              onClick={() => setActiveSidePanel((prev) => (prev === "history" ? null : "history"))}
              variant={activeSidePanel === "history" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <Clock className="size-3.5" />
              <span>History</span>
              {messages.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {messages.length}
                </Badge>
              )}
            </Button>

            {/* Toggle Mastery Panel */}
            <Button
              onClick={() => setActiveSidePanel((prev) => (prev === "mastery" ? null : "mastery"))}
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
              variant="outline"
              size="sm"
              className="rounded-full text-xs h-8 gap-1.5"
            >
              <Upload className="size-3.5" />
              <span>Upload</span>
            </Button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {/* Messages rendering omitted for brevity */}
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something…"
            className="flex-1"
            rows={1}
          />
          <Button type="submit" disabled={!input.trim() || isStreaming} size="icon" className="size-9 rounded-xl shadow-xs">
            {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>

      {/* Side Drawer / Panel */}
      {activeSidePanel && (
        <aside className="w-full lg:w-80 shrink-0 border border-border bg-card rounded-3xl p-4 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              {activeSidePanel === "materials" ? (
                <>
                  <FolderGit2 className="size-4 text-primary" />
                  <span>My Materials</span>
                </>
              ) : activeSidePanel === "mastery" ? (
                <>
                  <TrendingUp className="size-4 text-primary" />
                  <span>Topic Mastery</span>
                </>
              ) : (
                <>
                  <Clock className="size-4 text-primary" />
                  <span>Chat History</span>
                </>
              )}
            </div>
            <Button onClick={() => setActiveSidePanel(null)} variant="ghost" size="icon" className="size-7 rounded-full text-muted-foreground hover:text-foreground">
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

// Note: helper functions like handleNewChat, handleSendMessage, handleFileUpload, getMasteryColor remain unchanged.

export default function TutorPage() {
  return (
    <StudyLayout>
      <TutorContent />
    </StudyLayout>
  );
}
