import type { MediaStatus } from "@/types/app";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function normalizeConnectionKey(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function formatStatus(status: MediaStatus) {
  switch (status) {
    case "planned":
      return "Planned";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "dropped":
      return "Dropped";
    default:
      return status;
  }
}

export function formatRating(rating: number | null) {
  if (rating === null) {
    return "No rating";
  }

  return rating.toFixed(1);
}

export function getRatingColor(rating: number | null) {
  if (rating === null) {
    return "#9ca3af";
  }

  if (rating < 2.5) {
    return "#ef4444";
  }

  if (rating < 4.5) {
    return "#f97316";
  }

  if (rating < 6.5) {
    return "#eab308";
  }

  if (rating < 8.5) {
    return "#84cc16";
  }

  return "#22c55e";
}

export function detectPreferredLanguageFromText(text: string): "ru" | "en" {
  const value = text.trim();

  if (!value) {
    return "en";
  }

  return /[\u0400-\u04FF]/.test(value) ? "ru" : "en";
}
