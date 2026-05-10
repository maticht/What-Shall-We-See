import type { CategoryGlobalType } from "@/types/app";

export function normalizeCategoryGlobalType(
  value: unknown,
): CategoryGlobalType {
  switch (value) {
    case "movie":
    case "game":
    case "anime":
    case "book":
      return value;
    case "other":
    default:
      return "other";
  }
}

export function supportsExternalSuggestions(globalType: CategoryGlobalType) {
  return globalType !== "other";
}
