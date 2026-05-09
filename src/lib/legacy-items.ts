import { Types } from "mongoose";
import Category from "@/models/category";
import Item from "@/models/item";
import type { MediaStatus } from "@/types/app";

type LegacyItem = {
  title?: string;
  status?: MediaStatus;
  imageUrl?: string;
  sourceUrl?: string | null;
  rating?: number | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedAt?: Date | string;
  createdAt?: Date | string;
};

function asValidStatus(value: unknown): MediaStatus {
  if (value === "planned" || value === "in_progress" || value === "done") {
    return value;
  }

  return "planned";
}

export async function migrateLegacyItemsForCategory(categoryId: string) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return;
  }

  const categoryObjectId = new Types.ObjectId(categoryId);
  const existingItemsCount = await Item.countDocuments({ categoryId: categoryObjectId });

  if (existingItemsCount > 0) {
    return;
  }

  const legacyCategory = (await Category.collection.findOne(
    { _id: categoryObjectId },
    { projection: { items: 1 } },
  )) as { items?: LegacyItem[] } | null;

  const legacyItems = Array.isArray(legacyCategory?.items)
    ? legacyCategory.items
    : [];

  if (!legacyItems.length) {
    return;
  }

  const sanitizedItems = legacyItems
    .filter((item) => Boolean(item?.title) && Boolean(item?.imageUrl))
    .map((item) => ({
      categoryId: categoryObjectId,
      title: String(item.title).trim(),
      status: asValidStatus(item.status),
      imageUrl: String(item.imageUrl).trim(),
      sourceUrl:
        typeof item.sourceUrl === "string" && item.sourceUrl.trim()
          ? item.sourceUrl.trim()
          : null,
      rating: typeof item.rating === "number" ? item.rating : null,
      updatedByName: item.updatedByName ?? null,
      updatedByEmail: item.updatedByEmail ?? null,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    }));

  if (!sanitizedItems.length) {
    await Category.collection.updateOne(
      { _id: categoryObjectId },
      { $unset: { items: "" } },
    );
    return;
  }

  await Item.insertMany(sanitizedItems, { ordered: false });
  await Category.collection.updateOne(
    { _id: categoryObjectId },
    { $unset: { items: "" } },
  );
}

export async function migrateLegacyItemsForCategories(categoryIds: string[]) {
  for (const categoryId of categoryIds) {
    await migrateLegacyItemsForCategory(categoryId);
  }
}
