import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import {
  normalizeCategoryGlobalType,
  supportsExternalSuggestions,
} from "@/lib/category-global-type";
import {
  searchExternalCatalogSuggestions,
  type SuggestionLanguage,
} from "@/lib/external-suggestions";
import { findAuthorizedCategory } from "@/lib/category-access";
import { detectPreferredLanguageFromText } from "@/lib/utils";

export const runtime = "nodejs";

function detectLanguage(query: string): SuggestionLanguage {
  return detectPreferredLanguageFromText(query);
}

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return 8;
  }

  return Math.max(1, Math.min(parsed, 12));
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

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const language = detectLanguage(query);
  const limit = parseLimit(url.searchParams.get("limit"));
  const globalType = normalizeCategoryGlobalType(category.globalType);

  if (!supportsExternalSuggestions(globalType)) {
    return NextResponse.json({
      enabled: false,
      globalType,
      language,
      suggestions: [],
      warning: null,
    });
  }

  const result = await searchExternalCatalogSuggestions({
    globalType,
    query,
    language,
    limit,
  });

  return NextResponse.json({
    enabled: true,
    globalType,
    language,
    suggestions: result.suggestions,
    warning: result.warning,
  });
}
