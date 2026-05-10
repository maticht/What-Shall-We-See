import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import { findAuthorizedCategory } from "@/lib/category-access";
import { normalizeCategoryGlobalType } from "@/lib/category-global-type";
import {
  resolveExternalItemDetails,
  type DetailLanguage,
} from "@/lib/external-item-details";
import { serializeItem } from "@/lib/serializers";
import { detectPreferredLanguageFromText } from "@/lib/utils";
import Item from "@/models/item";

export const runtime = "nodejs";

function detectLanguage(title: string): DetailLanguage {
  return detectPreferredLanguageFromText(title);
}

export async function GET(
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

  const item = await Item.findOne({ _id: itemId, categoryId: category._id }).lean();

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const serializedItem = serializeItem(item, {
    currentUserId: user._id.toString(),
    isSharedCategory: category.scope === "shared",
  });

  const language = detectLanguage(serializedItem.title);
  const globalType = normalizeCategoryGlobalType(category.globalType);

  const external = await resolveExternalItemDetails({
    globalType,
    title: serializedItem.title,
    sourceUrl: serializedItem.sourceUrl,
    language,
  });

  return NextResponse.json({
    item: serializedItem,
    globalType,
    language,
    external,
  });
}
