import type { CategoryGlobalType, MediaStatus } from "@/types/app";

export const DEFAULT_CATEGORY_EMOJI = "📁";
export const EMPTY_ITEM_IMAGE_VALUE = "__NO_IMAGE__";

export const CATEGORY_GLOBAL_TYPE_OPTIONS: Array<{
  value: CategoryGlobalType;
  label: string;
  description: string;
}> = [
  {
    value: "movie",
    label: "Films",
    description: "Movies and series. Uses TMDB suggestions.",
  },
  {
    value: "game",
    label: "Games",
    description: "Video games. Uses IGDB suggestions.",
  },
  {
    value: "anime",
    label: "Anime",
    description: "Anime and manga. Uses Shikimori suggestions.",
  },
  {
    value: "book",
    label: "Books",
    description: "Books and novels. Uses Open Library suggestions.",
  },
  {
    value: "other",
    label: "Other",
    description: "Custom list without external search suggestions.",
  },
];

export const DEFAULT_PERSONAL_CATEGORIES = [
  { name: "Movies", emoji: "🎬", globalType: "movie" as const },
  { name: "Series", emoji: "📺", globalType: "movie" as const },
  { name: "Books", emoji: "📚", globalType: "book" as const },
  { name: "Manga", emoji: "✨", globalType: "anime" as const },
  { name: "Manhwa", emoji: "🌙", globalType: "anime" as const },
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
  {
    value: "dropped",
    label: "Dropped",
    description: "Stopped and not continuing.",
  },
];
