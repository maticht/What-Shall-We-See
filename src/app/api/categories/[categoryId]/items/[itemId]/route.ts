import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import { findAuthorizedCategory } from "@/lib/category-access";
import { migrateLegacyItemsForCategory } from "@/lib/legacy-items";
import { parseItemPayload } from "@/lib/validators";
import Item from "@/models/item";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string; itemId: string }> },
) {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { categoryId, itemId } = await context.params;
    const category = await findAuthorizedCategory(
      categoryId,
      user._id.toString(),
      user.connections ?? [],
    );

    if (category === null) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (!category) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await migrateLegacyItemsForCategory(categoryId);

    const payload = parseItemPayload(await request.json());
    const item = await Item.findOne({ _id: itemId, categoryId: category._id });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    item.title = payload.title;
    item.status = payload.status;
    item.imageUrl = payload.imageUrl;
    item.sourceUrl = payload.sourceUrl;

    const currentUserId = user._id.toString();
    const ratings = Array.isArray(item.ratings) ? [...item.ratings] : [];
    const existingRatingIndex = ratings.findIndex(
      (entry) => entry.userId?.toString() === currentUserId,
    );

    if (payload.rating === null) {
      if (existingRatingIndex >= 0) {
        ratings.splice(existingRatingIndex, 1);
      }
    } else if (existingRatingIndex >= 0) {
      ratings[existingRatingIndex].value = payload.rating;
      ratings[existingRatingIndex].updatedByName = user.name;
      ratings[existingRatingIndex].updatedByEmail = user.email;
      ratings[existingRatingIndex].updatedAt = new Date();
    } else {
      ratings.push({
        userId: user._id,
        value: payload.rating,
        updatedByName: user.name,
        updatedByEmail: user.email,
        updatedAt: new Date(),
      });
    }

    item.ratings = ratings;
    if (category.scope === "personal") {
      item.rating = payload.rating;
    } else if (!ratings.length) {
      item.rating = null;
    }
    item.updatedByName = user.name;
    item.updatedByEmail = user.email;
    await item.save();

    category.lastEditedByName = user.name;
    category.lastEditedByEmail = user.email;
    await category.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update item.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ categoryId: string; itemId: string }> },
) {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryId, itemId } = await context.params;
  const category = await findAuthorizedCategory(
    categoryId,
    user._id.toString(),
    user.connections ?? [],
  );

  if (category === null) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (!category) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await migrateLegacyItemsForCategory(categoryId);

  const deletion = await Item.deleteOne({ _id: itemId, categoryId: category._id });

  if (!deletion.deletedCount) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  category.lastEditedByName = user.name;
  category.lastEditedByEmail = user.email;
  await category.save();

  return NextResponse.json({ ok: true });
}
