import type { CategoryGlobalType, CategoryScope, MediaStatus } from "@/types/app";
import { DEFAULT_CATEGORY_EMOJI } from "@/lib/constants";
import { normalizeConnectionKey } from "@/lib/utils";

const STATUS_VALUES: MediaStatus[] = ["planned", "in_progress", "done", "dropped"];
const CATEGORY_GLOBAL_TYPE_VALUES: CategoryGlobalType[] = [
  "movie",
  "game",
  "anime",
  "book",
  "other",
];

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parsePositiveInt(value: string, fallback: number, min = 0) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(min, parsed);
}

function parseHttpUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseConnectionKey(value: unknown) {
  const normalized = normalizeConnectionKey(asString(value));

  if (!normalized) {
    throw new Error("Connection code is required.");
  }

  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized)) {
    throw new Error(
      "Connection code must be 3-32 characters and use letters, numbers, dashes, or underscores.",
    );
  }

  return normalized;
}

export function parseCategoryPayload(payload: unknown): {
  name: string;
  emoji: string;
  scope: CategoryScope;
  globalType: CategoryGlobalType;
  connectionKey: string | null;
} {
  const data = typeof payload === "object" && payload !== null ? payload : {};
  const name = asString((data as { name?: unknown }).name).trim();
  const emoji = asString((data as { emoji?: unknown }).emoji).trim();
  const scope = asString((data as { scope?: unknown }).scope) as CategoryScope;
  const globalType = asString(
    (data as { globalType?: unknown }).globalType,
  ) as CategoryGlobalType;
  const rawConnectionKey = (data as { connectionKey?: unknown }).connectionKey;

  if (name.length < 2 || name.length > 48) {
    throw new Error("Category name must be between 2 and 48 characters.");
  }

  if (scope !== "personal" && scope !== "shared") {
    throw new Error("Category scope must be personal or shared.");
  }

  if (!CATEGORY_GLOBAL_TYPE_VALUES.includes(globalType)) {
    throw new Error("Category global type is invalid.");
  }

  if (emoji.length > 32) {
    throw new Error("Category emoji is too long.");
  }

  return {
    name,
    emoji: emoji || DEFAULT_CATEGORY_EMOJI,
    scope,
    globalType,
    connectionKey: scope === "shared" ? parseConnectionKey(rawConnectionKey) : null,
  };
}

export function parseCategoryPatchPayload(payload: unknown) {
  const data = typeof payload === "object" && payload !== null ? payload : {};
  const name = asString((data as { name?: unknown }).name).trim();
  const emoji = asString((data as { emoji?: unknown }).emoji).trim();
  const globalType = asString(
    (data as { globalType?: unknown }).globalType,
  ) as CategoryGlobalType;

  if (name.length < 2 || name.length > 48) {
    throw new Error("Category name must be between 2 and 48 characters.");
  }

  if (emoji.length > 32) {
    throw new Error("Category emoji is too long.");
  }

  if (!CATEGORY_GLOBAL_TYPE_VALUES.includes(globalType)) {
    throw new Error("Category global type is invalid.");
  }

  return { name, emoji: emoji || DEFAULT_CATEGORY_EMOJI, globalType };
}

export function parseItemPayload(payload: unknown): {
  title: string;
  status: MediaStatus;
  imageUrl: string;
  sourceUrl: string | null;
  rating: number | null;
} {
  const data = typeof payload === "object" && payload !== null ? payload : {};
  const title = asString((data as { title?: unknown }).title).trim();
  const status = asString((data as { status?: unknown }).status) as MediaStatus;
  const rawImageUrl = asString((data as { imageUrl?: unknown }).imageUrl).trim();
  const parsedImageUrl = rawImageUrl ? parseHttpUrl(rawImageUrl) : null;
  const imageUrl = parsedImageUrl ?? "";
  const rawSourceUrl = asString((data as { sourceUrl?: unknown }).sourceUrl).trim();
  const sourceUrl = rawSourceUrl ? parseHttpUrl(rawSourceUrl) : null;
  const rawRating = (data as { rating?: unknown }).rating;
  const rating =
    rawRating === "" || rawRating === null || rawRating === undefined
      ? null
      : Number(rawRating);
  const normalizedRating = rating === 0 ? null : rating;

  if (title.length < 1 || title.length > 120) {
    throw new Error("Card title must be between 1 and 120 characters.");
  }

  if (!STATUS_VALUES.includes(status)) {
    throw new Error("Card status is invalid.");
  }

  if (rawImageUrl && !parsedImageUrl) {
    throw new Error("Image URL must be a valid http or https link.");
  }

  if (rawSourceUrl && !sourceUrl) {
    throw new Error("Source link must be a valid http or https URL.");
  }

  if (
    normalizedRating !== null &&
    (!Number.isFinite(normalizedRating) || normalizedRating < 0 || normalizedRating > 10)
  ) {
    throw new Error("Rating must be between 0 and 10.");
  }

  return {
    title,
    status,
    imageUrl,
    sourceUrl,
    rating: normalizedRating,
  };
}

export function parseItemPagination(searchParams: URLSearchParams) {
  const limit = Math.min(parsePositiveInt(searchParams.get("limit") ?? "", 50, 1), 100);
  const offset = parsePositiveInt(searchParams.get("offset") ?? "", 0, 0);
  const range = asString(searchParams.get("range")).trim();

  if (!range) {
    return { offset, limit };
  }

  const [fromRaw, toRaw] = range.split(/[:-]/, 2);
  const from = parsePositiveInt(fromRaw ?? "", offset, 0);
  const to = parsePositiveInt(toRaw ?? "", from + limit - 1, from);
  const rangeLimit = Math.max(1, to - from + 1);

  return {
    offset: from,
    limit: Math.min(rangeLimit, 100),
  };
}
