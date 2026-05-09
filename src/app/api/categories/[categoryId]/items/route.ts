import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import { findAuthorizedCategory } from "@/lib/category-access";
import { migrateLegacyItemsForCategory } from "@/lib/legacy-items";
import { serializeItem } from "@/lib/serializers";
import { parseItemPagination, parseItemPayload } from "@/lib/validators";
import Item from "@/models/item";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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

  await migrateLegacyItemsForCategory(categoryId);

  const url = new URL(request.url);
  const { offset, limit } = parseItemPagination(url.searchParams);

  const [items, total] = await Promise.all([
    Item.find({ categoryId: category._id })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Item.countDocuments({ categoryId: category._id }),
  ]);

  const from = total === 0 ? 0 : Math.min(offset, total - 1);
  const to = total === 0 ? 0 : Math.min(offset + items.length - 1, total - 1);

  return NextResponse.json({
    items: items.map((item) =>
      serializeItem(item, {
        currentUserId: user._id.toString(),
        isSharedCategory: category.scope === "shared",
      }),
    ),
    total,
    offset,
    limit,
    range: {
      from,
      to,
    },
    hasMore: offset + items.length < total,
  });
}

export async function POST(
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

    await migrateLegacyItemsForCategory(categoryId);

    const payload = parseItemPayload(await request.json());

    await Item.create({
      title: payload.title,
      status: payload.status,
      imageUrl: payload.imageUrl,
      sourceUrl: payload.sourceUrl,
      rating: payload.rating,
      ratings:
        payload.rating === null
          ? []
          : [
              {
                userId: user._id,
                value: payload.rating,
                updatedByName: user.name,
                updatedByEmail: user.email,
                updatedAt: new Date(),
              },
            ],
      categoryId: category._id,
      updatedByName: user.name,
      updatedByEmail: user.email,
    });

    category.lastEditedByName = user.name;
    category.lastEditedByEmail = user.email;
    await category.save();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add item.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
