import { Types } from "mongoose";
import Category from "@/models/category";

export function canAccessCategory(
  category: {
    scope: "personal" | "shared";
    ownerId?: { toString(): string } | null;
    connectionKey?: string | null;
  },
  userId: string,
  connections: string[],
) {
  const connectionKey = category.connectionKey ?? null;
  const isPersonalOwner =
    category.scope === "personal" && category.ownerId?.toString() === userId;
  const isSharedMember =
    category.scope === "shared" &&
    (connectionKey ? connections.includes(connectionKey) : false);

  return isPersonalOwner || isSharedMember;
}

export async function findAuthorizedCategory(
  categoryId: string,
  userId: string,
  connections: string[],
) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return null;
  }

  if (!canAccessCategory(category, userId, connections)) {
    return undefined;
  }

  return category;
}
