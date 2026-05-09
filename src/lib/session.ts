import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "what-shall-we-see.session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export interface AppSessionUser {
  id: string;
  email: string;
  name: string;
  image: string;
}

interface SessionPayload extends AppSessionUser {
  exp: number;
}

function getSessionSecret() {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "development-only-secret"
  );
}

function shouldUseSecureCookies() {
  const authBaseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  return authBaseUrl.startsWith("https://") || process.env.VERCEL === "1";
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function encodePayload(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function decodePayload(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = signValue(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload?.email || !payload?.id || !payload?.exp) {
      return null;
    }

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge,
  };
}

export function createSessionValue(user: AppSessionUser) {
  return encodePayload({
    ...user,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
}

export async function readSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;

  if (!raw) {
    return null;
  }

  const payload = decodePayload(raw);

  if (!payload) {
    return null;
  }

  return {
    user: {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      image: payload.image,
    },
  };
}

export function attachSessionCookie(
  response: NextResponse,
  user: AppSessionUser,
) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionValue(user),
    getCookieOptions(SESSION_MAX_AGE),
  );
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", getCookieOptions(0));
}
