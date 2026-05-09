import { readSession } from "@/lib/session";

export async function auth() {
  return readSession();
}
