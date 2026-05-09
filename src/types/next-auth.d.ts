import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      connections: string[];
    };
  }

  interface User {
    connections?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUserId?: string;
    connections?: string[];
  }
}
