import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { DEFAULT_PERSONAL_CATEGORIES } from "@/lib/constants";
import { canAccessCategory } from "@/lib/category-access";
import {
  migrateLegacyItemsForCategories,
  migrateLegacyItemsForCategory,
} from "@/lib/legacy-items";
import { serializeCategory, serializeItem } from "@/lib/serializers";
import Category from "@/models/category";
import Item from "@/models/item";
import User from "@/models/user";
import type { DashboardData, DashboardUser, PaginatedItemsData } from "@/types/app";

function serializeUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  image?: string;
  connections?: string[];
}): DashboardUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? "",
    connections: [...new Set((user.connections ?? []).filter(Boolean))].sort(),
  };
}

async function getItemCountsByCategoryIds(categoryIds: string[]) {
  if (!categoryIds.length) {
    return new Map<string, number>();
  }

  const objectIds = categoryIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const rows = await Item.aggregate<{
    _id: { toString(): string };
    count: number;
  }>([
    {
      $match: {
        categoryId: {
          $in: objectIds,
        },
      },
    },
    {
      $group: {
        _id: "$categoryId",
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row._id.toString(), row.count);
  }

  return counts;
}

async function getCategoryItemsPage(
  categoryId: string,
  offset: number,
  limit: number,
  options?: { currentUserId?: string; isSharedCategory?: boolean },
): Promise<PaginatedItemsData> {
  const [items, total] = await Promise.all([
    Item.find({ categoryId })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Item.countDocuments({ categoryId }),
  ]);

  const safeOffset = Math.max(0, Math.min(offset, Math.max(total - 1, 0)));
  const from = total === 0 ? 0 : safeOffset;
  const to = total === 0 ? 0 : Math.min(safeOffset + limit - 1, total - 1);

  return {
    items: items.map((item) => serializeItem(item, options)),
    total,
    offset,
    limit,
    range: {
      from,
      to,
    },
    hasMore: offset + items.length < total,
  };
}

export async function upsertOAuthUser(input: {
  email: string;
  name: string;
  image?: string | null;
  googleId?: string | null;
}) {
  await connectToDatabase();

  return User.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    {
      $set: {
        email: input.email.toLowerCase(),
        name: input.name,
        image: input.image ?? "",
        googleId: input.googleId ?? undefined,
      },
      $setOnInsert: {
        connections: [],
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

export async function getAppUserByEmail(email: string) {
  await connectToDatabase();

  return User.findOne({ email: email.toLowerCase() });
}

export async function ensureDefaultPersonalCategories(userId: string) {
  await connectToDatabase();

  const existingCount = await Category.countDocuments({
    scope: "personal",
    ownerId: userId,
  });

  if (existingCount > 0) {
    return;
  }

  await Category.insertMany(
    DEFAULT_PERSONAL_CATEGORIES.map((category) => ({
      name: category.name,
      emoji: category.emoji,
      globalType: category.globalType,
      scope: "personal",
      ownerId: userId,
      createdBy: userId,
    })),
  );
}

export async function getDashboardDataByEmail(
  email: string,
): Promise<DashboardData | null> {
  await connectToDatabase();

  const userDocument = await User.findOne({ email: email.toLowerCase() }).lean();

  if (!userDocument) {
    return null;
  }

  const user = serializeUser(userDocument);

  await ensureDefaultPersonalCategories(user.id);

  const [personalCategories, sharedCategories] = await Promise.all([
    Category.find({
      scope: "personal",
      ownerId: user.id,
    })
      .sort({ updatedAt: -1, name: 1 })
      .lean(),
    user.connections.length
      ? Category.find({
          scope: "shared",
          connectionKey: { $in: user.connections },
        })
          .sort({ updatedAt: -1, name: 1 })
          .lean()
      : Promise.resolve([]),
  ]);

  const allCategoryIds = [...personalCategories, ...sharedCategories].map((category) =>
    category._id.toString(),
  );

  await migrateLegacyItemsForCategories(allCategoryIds);

  const itemCounts = await getItemCountsByCategoryIds(allCategoryIds);

  return {
    user,
    personalCategories: personalCategories.map((category) =>
      serializeCategory(category, itemCounts.get(category._id.toString()) ?? 0),
    ),
    sharedCategories: sharedCategories.map((category) =>
      serializeCategory(category, itemCounts.get(category._id.toString()) ?? 0),
    ),
  };
}

export async function getCategoryDataByEmail(email: string, categoryId: string) {
  await connectToDatabase();

  const userDocument = await User.findOne({ email: email.toLowerCase() }).lean();

  if (!userDocument) {
    return null;
  }

  const user = serializeUser(userDocument);
  const category = await Category.findById(categoryId).lean();

  if (!category) {
    return null;
  }

  if (!canAccessCategory(category, user.id, user.connections)) {
    return null;
  }

  await migrateLegacyItemsForCategory(categoryId);

  const [itemsCount, firstPage] = await Promise.all([
    Item.countDocuments({ categoryId }),
    getCategoryItemsPage(categoryId, 0, 50, {
      currentUserId: user.id,
      isSharedCategory: category.scope === "shared",
    }),
  ]);

  return {
    user,
    category: serializeCategory(category, itemsCount),
    firstPage,
  };
}
