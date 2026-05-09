import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardDataByEmail } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  const data = await getDashboardDataByEmail(session.user.email);

  if (!data) {
    redirect("/");
  }

  return <DashboardShell data={data} />;
}
