import { redirect } from "next/navigation";
import { BookOpen, Sparkles, Users2 } from "lucide-react";
import { auth } from "@/auth";
import { SignInButton } from "@/components/auth-buttons";
import { Surface } from "@/components/ui/surface";

const featureCards = [
  {
    title: "Personal categories",
    description:
      "Separate shelves for movies, series, books, manga, and manhwa.",
    icon: BookOpen,
  },
  {
    title: "Shared spaces",
    description:
      "Connection codes unlock the same collaborative categories for both people.",
    icon: Users2,
  },
  {
    title: "Statuses and ratings",
    description: "Track progress and keep your own score on every card.",
    icon: Sparkles,
  },
];

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:py-6">
      <Surface className="px-4 py-4 sm:px-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Media planner
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-100">
              What Shall We See
            </h1>
            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-stone-100 sm:text-4xl">
              Track what to watch, read, and share.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
              A strict, calm workspace for personal lists and collaborative
              categories with Google sign-in, ratings, statuses, and thoughtful
              mobile layout.
            </p>
          </div>

          <SignInButton className="lg:justify-self-end" />
        </div>
      </Surface>

      <section className="grid gap-3 lg:grid-cols-3">
        {featureCards.map(({ title, description, icon: Icon }) => (
          <Surface key={title} className="p-4">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] text-stone-100">
              <Icon size={16} />
            </div>
            <h3 className="mt-3 text-base font-semibold text-stone-100">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-stone-300">
              {description}
            </p>
          </Surface>
        ))}
      </section>
    </main>
  );
}
