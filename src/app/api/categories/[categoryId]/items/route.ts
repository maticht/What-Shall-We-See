import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import { findAuthorizedCategory } from "@/lib/category-access";
import { EMPTY_ITEM_IMAGE_VALUE } from "@/lib/constants";
import { migrateLegacyItemsForCategory } from "@/lib/legacy-items";
import { serializeItem } from "@/lib/serializers";
import { parseItemPagination, parseItemPayload } from "@/lib/validators";
import Item from "@/models/item";

export const runtime = "nodejs";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STATUS_FILTER_VALUES = ["all", "planned", "in_progress", "done", "dropped"] as const;
const RATING_FILTER_VALUES = ["all", "rated", "unrated", "high", "low"] as const;

type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];
type RatingFilter = (typeof RATING_FILTER_VALUES)[number];

function parseStatusFilter(value: string | null): StatusFilter {
  if (!value) {
    return "all";
  }

  return STATUS_FILTER_VALUES.includes(value as StatusFilter)
    ? (value as StatusFilter)
    : "all";
}

function parseRatingFilter(value: string | null): RatingFilter {
  if (!value) {
    return "all";
  }

  return RATING_FILTER_VALUES.includes(value as RatingFilter)
    ? (value as RatingFilter)
    : "all";
}

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
  const query = (url.searchParams.get("q") ?? "").trim();
  const statusFilter = parseStatusFilter(url.searchParams.get("status"));
  const ratingFilter = parseRatingFilter(url.searchParams.get("ratingFilter"));
  const itemFilter: Record<string, unknown> =
    query.length > 0
      ? {
          categoryId: category._id,
          title: {
            $regex: escapeRegex(query),
            $options: "i",
          },
        }
      : { categoryId: category._id };

  if (statusFilter !== "all") {
    itemFilter.status = statusFilter;
  }

  if (ratingFilter === "rated") {
    itemFilter.ratings = { $elemMatch: { userId: user._id } };
  } else if (ratingFilter === "unrated") {
    itemFilter.ratings = { $not: { $elemMatch: { userId: user._id } } };
  } else if (ratingFilter === "high") {
    itemFilter.ratings = { $elemMatch: { userId: user._id, value: { $gte: 7 } } };
  } else if (ratingFilter === "low") {
    itemFilter.ratings = { $elemMatch: { userId: user._id, value: { $lt: 7 } } };
  }

  const [items, total] = await Promise.all([
    Item.find(itemFilter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Item.countDocuments(itemFilter),
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
    const normalizedImageUrl = payload.imageUrl || EMPTY_ITEM_IMAGE_VALUE;

    const item = new Item({
      title: payload.title,
      status: payload.status,
      imageUrl: normalizedImageUrl,
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
    // We validate payload in parseItemPayload; skip stale schema enum on hot-reloaded model.
    await item.save({ validateBeforeSave: false });

    category.lastEditedByName = user.name;
    category.lastEditedByEmail = user.email;
    await category.save();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add item.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

