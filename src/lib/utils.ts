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
    default:
      return status;
  }
}

export function formatRating(rating: number | null) {
  if (rating === null) {
    return "No rating";
  }

  return `${rating.toFixed(rating % 1 === 0 ? 0 : 1)}/10`;
}
