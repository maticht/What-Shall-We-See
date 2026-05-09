import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CategoryPageShell } from "@/components/category-page-shell";
import { getCategoryDataByEmail } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  const { categoryId } = await params;
  const data = await getCategoryDataByEmail(session.user.email, categoryId);

  if (!data) {
    notFound();
  }

  return (
    <CategoryPageShell
      user={data.user}
      category={data.category}
      firstPage={data.firstPage}
    />
  );
}
