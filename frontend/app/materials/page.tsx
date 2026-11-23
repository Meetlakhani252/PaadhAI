"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ExternalLink,
  FileText,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Video,
  Bookmark,
  Share2,
  Copy,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import { StudyLayout } from "@/components/study-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubjects } from "@/lib/demo-store";
import {
  DEFAULT_MATERIALS,
  StudyMaterial,
  MaterialType,
} from "@/lib/materials-data";

const STORAGE_KEY = "studystack.custom-materials.v1";

const TYPE_CONFIG: Record<
  MaterialType,
  { label: string; icon: typeof Video; color: string; badgeClass: string }
> = {
  video: {
    label: "Video",
    icon: Video,
    color: "text-red-500",
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  notes: {
    label: "Notes",
    icon: FileText,
    color: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  cheatsheet: {
    label: "Cheatsheet",
    icon: BookOpen,
    color: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  link: {
    label: "Interactive Tool",
    icon: ExternalLink,
    color: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
};

function MaterialsContent() {
  const { subjects } = useSubjects();
  const [customMaterials, setCustomMaterials] = useState<StudyMaterial[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formType, setFormType] = useState<MaterialType>("video");
  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formAuthor, setFormAuthor] = useState("");

  // Load custom materials
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCustomMaterials(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save custom materials
  const saveCustom = (updated: StudyMaterial[]) => {
    setCustomMaterials(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const allMaterials = useMemo(() => {
    return [...customMaterials, ...DEFAULT_MATERIALS];
  }, [customMaterials]);

  // Distinct subjects available across active subjects and materials
  const availableSubjects = useMemo(() => {
    const list = new Set<string>();
    subjects.forEach((s) => list.add(s.name));
    allMaterials.forEach((m) => list.add(m.subjectName));
    return Array.from(list);
  }, [subjects, allMaterials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return allMaterials.filter((m) => {
      const matchSubject =
        selectedSubject === "all" ||
        m.subjectName.toLowerCase() === selectedSubject.toLowerCase();
      const matchType = selectedType === "all" || m.type === selectedType;
      const matchQuery =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.topicName && m.topicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.authorOrChannel &&
          m.authorOrChannel.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSubject && matchType && matchQuery;
    });
  }, [allMaterials, selectedSubject, selectedType, searchQuery]);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUrl.trim() || !formSubject.trim()) {
      toast.error("Please fill in the title, URL, and subject.");
      return;
    }

    const newMaterial: StudyMaterial = {
      id: `custom-${Date.now()}`,
      title: formTitle.trim(),
      description: formDesc.trim() || "User shared study resource.",
      type: formType,
      url: formUrl.trim(),
      subjectName: formSubject.trim(),
      topicName: formTopic.trim() || undefined,
      authorOrChannel: formAuthor.trim() || undefined,
      isCustom: true,
    };

    saveCustom([newMaterial, ...customMaterials]);
    toast.success("Study material added to your library!");
    setIsAddOpen(false);

    // Reset Form
    setFormTitle("");
    setFormDesc("");
    setFormUrl("");
    setFormSubject("");
    setFormTopic("");
    setFormAuthor("");
  };

  const handleDeleteCustom = (id: string) => {
    const next = customMaterials.filter((m) => m.id !== id);
    saveCustom(next);
    toast.success("Resource removed");
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Resource link copied to clipboard");
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Resources</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight text-foreground">
            Study Materials
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Save your own notes, video lectures, cheat sheets, and links — all in one place.
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="rounded-full shadow-sm"
        >
          <Plus className="mr-1.5 size-4" />
          Add Material
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, keyword, or author..."
              className="rounded-full pl-10 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="size-3.5" /> Filter by:
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="notes">Notes</option>
              <option value="cheatsheet">Cheatsheets</option>
              <option value="link">Interactive Tools</option>
            </select>
          </div>
        </div>

        {/* Subject Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <button
            onClick={() => setSelectedSubject("all")}
            className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
              selectedSubject === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            All Subjects ({allMaterials.length})
          </button>
          {availableSubjects.map((sub) => {
            const count = allMaterials.filter(
              (m) => m.subjectName.toLowerCase() === sub.toLowerCase()
            ).length;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  selectedSubject === sub
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {sub} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground/60" />
          <h2 className="mt-3 font-display text-2xl text-foreground">
            {searchQuery || selectedSubject !== "all" || selectedType !== "all"
              ? "No materials match your filters"
              : "Your library is empty"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery || selectedSubject !== "all" || selectedType !== "all"
              ? "Try adjusting your search or filter to find what you saved."
              : "Hit \"Add Material\" to save your first video, notes link, or cheat sheet — it lives here for good."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.badgeClass}`}
                    >
                      <Icon className="size-3" />
                      {config.label}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyUrl(item.url)}
                        title="Copy link"
                        className="flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:text-foreground"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      {item.isCustom && (
                        <button
                          onClick={() => handleDeleteCustom(item.id)}
                          title="Delete resource"
                          className="flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-60 transition-opacity hover:text-destructive hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="truncate max-w-[160px]">
                    <span className="font-medium text-foreground">
                      {item.subjectName}
                    </span>
                    {item.topicName && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {item.topicName}
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    Open
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Add Study Resource
            </DialogTitle>
            <DialogDescription>
              Save video lectures, lecture notes, formula sheets, or interactive links.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Resource Title</Label>
              <Input
                id="title"
                placeholder="e.g. Dynamic Programming Complete Playlist"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">Resource URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Resource Type</Label>
                <select
                  id="type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as MaterialType)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="video">Video Lecture</option>
                  <option value="notes">Lecture Notes</option>
                  <option value="cheatsheet">Cheatsheet</option>
                  <option value="link">Interactive Tool</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Data Structures"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Input
                  id="topic"
                  placeholder="e.g. Graph Algorithms"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="author">Author / Channel (Optional)</Label>
                <Input
                  id="author"
                  placeholder="e.g. MIT OpenCourseWare"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Description (Optional)</Label>
              <Textarea
                id="desc"
                rows={2}
                placeholder="Brief summary of why this resource is useful..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full rounded-full">
                Save to Library
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <StudyLayout>
      <MaterialsContent />
    </StudyLayout>
  );
}

