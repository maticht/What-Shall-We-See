import { NextResponse } from "next/server";
import { upsertOAuthUser } from "@/lib/dashboard-data";
import { getGoogleClientId, verifyGoogleCredential } from "@/lib/google-auth";
import { attachSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    clientId: getGoogleClientId(),
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { credential?: string };

    if (!payload.credential || typeof payload.credential !== "string") {
      return NextResponse.json(
        { ok: false, error: "credential is required" },
        { status: 400 },
      );
    }

    const profile = await verifyGoogleCredential(payload.credential);
    const user = await upsertOAuthUser({
      email: profile.email,
      name: profile.name,
      image: profile.picture,
      googleId: profile.googleId,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        image: user.image ?? "",
      },
    });

    attachSessionCookie(response, {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image ?? "",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Google sign-in failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 401 },
    );
  }
}
