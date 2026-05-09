import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import Category from "@/models/category";
import { parseItemPayload } from "@/lib/validators";

export const runtime = "nodejs";

async function findAuthorizedCategory(
  categoryId: string,
  userId: string,
  connections: string[],
) {
  const category = await Category.findById(categoryId);

  if (!category) {
    return null;
  }

  const isPersonalOwner =
    category.scope === "personal" && category.ownerId?.toString() === userId;
  const isSharedMember =
    category.scope === "shared" &&
    Boolean(category.connectionKey) &&
    connections.includes(category.connectionKey);

  if (!isPersonalOwner && !isSharedMember) {
    return undefined;
  }

  return category;
}

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

    const payload = parseItemPayload(await request.json());
    const item = category.items.id(itemId);

    if (!item) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    item.set(payload);
    item.set({
      updatedByName: user.name,
      updatedByEmail: user.email,
    });
    category.lastEditedByName = user.name;
    category.lastEditedByEmail = user.email;
    category.markModified("items");
    await category.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update card.";

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

  const item = category.items.id(itemId);

  if (!item) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  item.deleteOne();
  category.lastEditedByName = user.name;
  category.lastEditedByEmail = user.email;
  category.markModified("items");
  await category.save();

  return NextResponse.json({ ok: true });
}
