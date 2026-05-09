import { connectToDatabase } from "@/lib/db";
import { DEFAULT_PERSONAL_CATEGORIES } from "@/lib/constants";
import Category from "@/models/category";
import User from "@/models/user";
import type {
  CategoryData,
  DashboardData,
  DashboardUser,
  MediaItemData,
} from "@/types/app";

function toIso(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}

function serializeItem(item: {
  _id: { toString(): string };
  title: string;
  status: MediaItemData["status"];
  imageUrl: string;
  rating?: number | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedAt?: Date | string;
  createdAt?: Date | string;
}): MediaItemData {
  return {
    id: item._id.toString(),
    title: item.title,
    status: item.status,
    imageUrl: item.imageUrl,
    rating: item.rating ?? null,
    updatedByName: item.updatedByName ?? null,
    updatedByEmail: item.updatedByEmail ?? null,
    updatedAt: toIso(item.updatedAt ?? item.createdAt),
  };
}

function serializeCategory(category: {
  _id: { toString(): string };
  name: string;
  scope: CategoryData["scope"];
  connectionKey?: string | null;
  ownerId?: { toString(): string } | null;
  createdBy: { toString(): string };
  lastEditedByName?: string | null;
  lastEditedByEmail?: string | null;
  items?: Array<{
    _id: { toString(): string };
    title: string;
    status: MediaItemData["status"];
    imageUrl: string;
    rating?: number | null;
    updatedByName?: string | null;
    updatedByEmail?: string | null;
    updatedAt?: Date | string;
    createdAt?: Date | string;
  }>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): CategoryData {
  const items = (category.items ?? [])
    .map(serializeItem)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    id: category._id.toString(),
    name: category.name,
    scope: category.scope,
    connectionKey: category.connectionKey ?? null,
    ownerId: category.ownerId ? category.ownerId.toString() : null,
    createdBy: category.createdBy.toString(),
    lastEditedByName: category.lastEditedByName ?? null,
    lastEditedByEmail: category.lastEditedByEmail ?? null,
    items,
    createdAt: toIso(category.createdAt),
    updatedAt: toIso(category.updatedAt),
  };
}

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
    DEFAULT_PERSONAL_CATEGORIES.map((name) => ({
      name,
      scope: "personal",
      ownerId: userId,
      createdBy: userId,
      items: [],
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

  return {
    user,
    personalCategories: personalCategories.map(serializeCategory),
    sharedCategories: sharedCategories.map(serializeCategory),
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

  const ownerId = category.ownerId ? category.ownerId.toString() : null;
  const connectionKey = category.connectionKey ?? null;
  const canReadPersonal = category.scope === "personal" && ownerId === user.id;
  const canReadShared =
    category.scope === "shared" &&
    Boolean(connectionKey) &&
    user.connections.includes(connectionKey);

  if (!canReadPersonal && !canReadShared) {
    return null;
  }

  return {
    user,
    category: serializeCategory(category),
  };
}
