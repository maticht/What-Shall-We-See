import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import { findAuthorizedCategory } from "@/lib/category-access";
import { parseCategoryPatchPayload } from "@/lib/validators";
import Item from "@/models/item";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { categoryId } = await context.params;
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

    const payload = parseCategoryPatchPayload(await request.json());

    await category.updateOne({
      $set: {
        name: payload.name,
        emoji: payload.emoji,
        lastEditedByName: user.name,
        lastEditedByEmail: user.email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update category.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryId } = await context.params;
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

  await Item.deleteMany({ categoryId: category._id });
  await category.deleteOne();

  return NextResponse.json({ ok: true });
}
