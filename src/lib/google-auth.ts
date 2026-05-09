export interface VerifiedGoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

export function getGoogleClientId() {
  return process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
}

export async function verifyGoogleCredential(
  credential: string,
): Promise<VerifiedGoogleProfile> {
  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    throw new Error("Google client ID is not configured.");
  }

  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Google token verification failed.");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const audience = String(payload.aud ?? "");
  const issuer = String(payload.iss ?? "");
  const email = String(payload.email ?? "").toLowerCase();
  const emailVerified = String(payload.email_verified ?? "") === "true";
  const googleId = String(payload.sub ?? "");
  const name = String(payload.name ?? "");
  const picture = String(payload.picture ?? "");

  if (audience !== googleClientId) {
    throw new Error("Google credential audience mismatch.");
  }

  if (
    issuer !== "accounts.google.com" &&
    issuer !== "https://accounts.google.com"
  ) {
    throw new Error("Google credential issuer is invalid.");
  }

  if (!email || !emailVerified || !googleId || !name) {
    throw new Error("Google credential is missing required profile data.");
  }

  return {
    googleId,
    email,
    name,
    picture,
  };
}
