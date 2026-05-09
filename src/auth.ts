import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { getAppUserByEmail, upsertOAuthUser } from "@/lib/dashboard-data";

const googleClientId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
const authSecret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  "development-only-secret";
const authBaseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
const useSecureCookies =
  authBaseUrl.startsWith("https://") || process.env.VERCEL === "1";

const providers = [
  Google({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
  }),
];

async function syncToken(
  email: string,
): Promise<{
  appUserId: string;
  connections: string[];
  name: string;
  image: string;
} | null> {
  const appUser = await getAppUserByEmail(email);

  if (!appUser) {
    return null;
  }

  const connections: string[] = [];

  for (const value of appUser.connections ?? []) {
    if (typeof value === "string" && !connections.includes(value)) {
      connections.push(value);
    }
  }

  connections.sort();

  return {
    appUserId: appUser._id.toString(),
    connections,
    name: appUser.name,
    image: appUser.image ?? "",
  };
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  useSecureCookies,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !user.name) {
        return false;
      }

      await upsertOAuthUser({
        email: user.email,
        name: user.name,
        image: user.image,
        googleId: account?.providerAccountId,
      });

      return true;
    },
    async jwt({ token }) {
      if (!token.email) {
        return token;
      }

      const appUser = await syncToken(token.email);

      if (!appUser) {
        return token;
      }

      token.appUserId = appUser.appUserId;
      token.connections = appUser.connections;
      token.name = appUser.name;
      token.picture = appUser.image;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.appUserId ?? "");
        session.user.connections = Array.isArray(token.connections)
          ? token.connections
          : [];
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

const handler = NextAuth(authOptions);

export { handler };
