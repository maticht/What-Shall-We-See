import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import Category from "@/models/category";
import { parseCategoryPayload } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personalCategories = await Category.find({
    scope: "personal",
    ownerId: user._id,
  }).sort({ updatedAt: -1, name: 1 });

  const sharedCategories = user.connections?.length
    ? await Category.find({
        scope: "shared",
        connectionKey: { $in: user.connections },
      }).sort({ updatedAt: -1, name: 1 })
    : [];

  return NextResponse.json({
    personalCategories,
    sharedCategories,
  });
}

export async function POST(request: Request) {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = parseCategoryPayload(await request.json());

    if (payload.scope === "shared" && !user.connections.includes(payload.connectionKey!)) {
      return NextResponse.json(
        { error: "You can only create shared categories for your own connection codes." },
        { status: 403 },
      );
    }

    const category = await Category.create({
      name: payload.name,
      emoji: payload.emoji,
      scope: payload.scope,
      globalType: payload.globalType,
      ownerId: payload.scope === "personal" ? user._id : null,
      connectionKey: payload.scope === "shared" ? payload.connectionKey : null,
      createdBy: user._id,
      lastEditedByName: user.name,
      lastEditedByEmail: user.email,
    });

    return NextResponse.json({ id: category._id.toString() }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create category.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
