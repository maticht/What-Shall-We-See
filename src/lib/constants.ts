import type { MediaStatus } from "@/types/app";

export const DEFAULT_PERSONAL_CATEGORIES = [
  "Movies",
  "Series",
  "Books",
  "Manga",
  "Manhwa",
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
