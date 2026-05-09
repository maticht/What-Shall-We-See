import { auth } from "@/auth";
import { getAppUserByEmail } from "@/lib/dashboard-data";

export async function requireAppUser() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await getAppUserByEmail(session.user.email);

  if (!user) {
    return null;
  }

  return user;
}
