"use client";

import { useState, useRef, useEffect } from "react";
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
  distance: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
  source_chunk_ids?: number[];
  isLoading?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

function TutorContent() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

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
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const response = await fetch(`${API_BASE_URL}/tutor/ingest`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { "X-User-Id": userId } : {}),
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to index PDF document");
      }

      toast.success(
        `Indexed "${file.name}" successfully! (${data.chunk_count} chunks ready for tutoring)`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/tutor/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { "X-User-Id": userId } : {}),
        },
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
                  {
                    description: payload.feedback || undefined,
                  }
                );
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
              // Ignore partial JSON parsing
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
                  "An error occurred while connecting to the tutor. Please check that your backend is running.",
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>RAG Personal Tutor</span>
          </div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            PaadhAI Tutor
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Answers questions strictly from your uploaded study materials and tracks your mastery.
          </p>
        </div>

        {/* Upload Button */}
        <div>
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
            variant="outline"
            className="rounded-full gap-2 border-primary/30 hover:border-primary text-xs md:text-sm"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Upload className="size-4 text-primary" />
            )}
            <span>{isUploading ? "Indexing..." : "Upload Study Material"}</span>
          </Button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 rounded-2xl">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Bot className="size-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Welcome to your Personal AI Tutor
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Upload a syllabus or study notes PDF above, then ask any question. Answers are grounded
              exclusively in your material.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg w-full text-left">
              {[
                "What are the main topics in my uploaded syllabus?",
                "Explain the core concept in simple terms.",
                "Give me a practice check question to test my understanding.",
                "Summarize key exam formulas from my notes.",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="p-3 text-xs rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
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
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <button
                      onClick={() => toggleSources(msg.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus:outline-none"
                    >
                      <BookOpen className="size-3.5" />
                      <span>
                        Study Material Sources ({msg.sources.length})
                      </span>
                      {expandedSources[msg.id] ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>

                    {expandedSources[msg.id] && (
                      <div className="mt-2 space-y-1.5">
                        {msg.sources.map((src, sIdx) => (
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
                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                              {src.distance !== undefined
                                ? `${((1 - src.distance) * 100).toFixed(0)}% match`
                                : ""}
                            </span>
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

      {/* Input area */}
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
  );
}

export default function TutorPage() {
  return (
    <StudyLayout>
      <TutorContent />
    </StudyLayout>
  );
}
