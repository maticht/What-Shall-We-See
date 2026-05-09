import type { MediaStatus } from "@/types/app";

export const DEFAULT_CATEGORY_EMOJI = "📁";

export const DEFAULT_PERSONAL_CATEGORIES = [
  { name: "Movies", emoji: "🎬" },
  { name: "Series", emoji: "📺" },
  { name: "Books", emoji: "📚" },
  { name: "Manga", emoji: "✨" },
  { name: "Manhwa", emoji: "🌙" },
] as const;

export const STATUS_OPTIONS: Array<{
  value: MediaStatus;
  label: string;
  description: string;
}> = [
  {
    value: "planned",
    label: "Planned",
    description: "Saved for later.",
  },
  {
    value: "in_progress",
    label: "In progress",
    description: "Currently reading or watching.",
  },
  {
    value: "done",
    label: "Done",
    description: "Finished and rated.",
  },
];
