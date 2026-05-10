import { DEFAULT_CATEGORY_EMOJI, EMPTY_ITEM_IMAGE_VALUE } from "@/lib/constants";
import type { CategoryData, MediaItemData } from "@/types/app";

export function toIso(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}

export function serializeItem(
  item: {
    _id: { toString(): string };
    categoryId: { toString(): string };
    title: string;
    status: MediaItemData["status"];
    imageUrl?: string | null;
    sourceUrl?: string | null;
    rating?: number | null;
    ratings?: Array<{
      userId?: { toString(): string } | string;
      value?: number | null;
      updatedByName?: string | null;
    }>;
    updatedByName?: string | null;
    updatedByEmail?: string | null;
    updatedAt?: Date | string;
    createdAt?: Date | string;
  },
  options?: {
    currentUserId?: string;
    isSharedCategory?: boolean;
  },
): MediaItemData {
  const currentUserId = options?.currentUserId ?? "";
  const normalizedRatings = (item.ratings ?? []).filter((entry) => {
    return typeof entry.value === "number" && Number.isFinite(entry.value);
  });

  const myRatingEntry = currentUserId
    ? normalizedRatings.find(
        (entry) => entry.userId?.toString() === currentUserId,
      )
    : undefined;

  const partnerEntry = currentUserId
    ? normalizedRatings.find(
        (entry) => entry.userId?.toString() !== currentUserId,
      )
    : undefined;

  const fallbackRating = item.rating ?? null;
  const shouldUseLegacyFallback =
    !options?.isSharedCategory && normalizedRatings.length === 0;
  const myRating = myRatingEntry?.value ?? (shouldUseLegacyFallback ? fallbackRating : null);

  return {
    id: item._id.toString(),
    categoryId: item.categoryId.toString(),
    title: item.title,
    status: item.status,
    imageUrl:
      item.imageUrl && item.imageUrl !== EMPTY_ITEM_IMAGE_VALUE
        ? item.imageUrl
        : "",
    sourceUrl: item.sourceUrl ?? null,
    rating: myRating,
    myRating,
    partnerRating: options?.isSharedCategory ? (partnerEntry?.value ?? null) : null,
    partnerLabel: options?.isSharedCategory
      ? (partnerEntry?.updatedByName ?? "Partner")
      : null,
    updatedByName: item.updatedByName ?? null,
    updatedByEmail: item.updatedByEmail ?? null,
    updatedAt: toIso(item.updatedAt ?? item.createdAt),
  };
}

export function serializeCategory(
  category: {
    _id: { toString(): string };
    name: string;
    emoji?: string | null;
    scope: CategoryData["scope"];
    globalType?: CategoryData["globalType"];
    connectionKey?: string | null;
    ownerId?: { toString(): string } | null;
    createdBy: { toString(): string };
    lastEditedByName?: string | null;
    lastEditedByEmail?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  },
  itemsCount: number,
): CategoryData {
  return {
    id: category._id.toString(),
    name: category.name,
    emoji: category.emoji || DEFAULT_CATEGORY_EMOJI,
    scope: category.scope,
    globalType: category.globalType ?? "other",
    connectionKey: category.connectionKey ?? null,
    ownerId: category.ownerId ? category.ownerId.toString() : null,
    createdBy: category.createdBy.toString(),
    lastEditedByName: category.lastEditedByName ?? null,
    lastEditedByEmail: category.lastEditedByEmail ?? null,
    itemsCount,
    createdAt: toIso(category.createdAt),
    updatedAt: toIso(category.updatedAt),
  };
}

