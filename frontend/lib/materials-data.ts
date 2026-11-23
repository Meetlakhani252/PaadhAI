export type MaterialType = "video" | "notes" | "cheatsheet" | "link";

export type StudyMaterial = {
  id: string;
  title: string;
  description: string;
  type: MaterialType;
  url: string;
  subjectName: string;
  topicName?: string;
  authorOrChannel?: string;
  durationOrPages?: string;
  isCustom?: boolean;
};

// No default/sample materials — the library is built entirely from what
// each user adds via the "Add Material" button.
export const DEFAULT_MATERIALS: StudyMaterial[] = [];
