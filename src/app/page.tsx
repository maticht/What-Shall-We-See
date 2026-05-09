import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Film, MoonStar, Sparkles, Users2 } from "lucide-react";
import { auth } from "@/auth";
import { SignInButton } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";

const featureCards = [
  {
    title: "Personal categories",
    description: "Keep separate shelves for movies, series, books, manga, and manhwa.",
    icon: BookOpen,
  },
  {
    title: "Shared spaces",
    description: "Use matching connection codes so both people can edit the same collections.",
    icon: Users2,
  },
  {
    title: "Statuses and ratings",
    description: "Track planned, in progress, or done items and leave your own score.",
    icon: Sparkles,
  },
];

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="relative overflow-hidden rounded-[36px] border border-black/10 bg-[var(--panel)] px-5 py-5 shadow-[0_30px_100px_rgba(20,20,20,0.08)] dark:border-white/10 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(201,180,155,0.24),transparent_44%),radial-gradient(circle_at_top_right,rgba(122,153,175,0.18),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(186,156,129,0.18),transparent_40%),radial-gradient(circle_at_top_right,rgba(102,132,158,0.18),transparent_34%)]" />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-stone-500 dark:text-stone-400">
              Media planner
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-3xl">
              What Shall We See
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="relative mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-stone-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200">
              <Film size={15} />
              A quiet place for every title you care about
            </div>
            <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-stone-950 dark:text-white sm:text-5xl">
              Track what you want to watch, read, and share.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-stone-600 dark:text-stone-300 sm:text-lg">
              A clean, Notion-inspired workspace with Google sign-in, personal
              shelves, collaborative categories, dark mode, and responsive cards
              for every device.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignInButton className="sm:min-w-[220px]" />
              <Link
                href="#features"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:-translate-y-0.5 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                See the flow
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[32px] border border-black/10 bg-stone-50/80 p-4 shadow-[0_20px_60px_rgba(20,20,20,0.06)] dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
            <div className="rounded-[26px] border border-black/10 bg-[var(--card)] p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                    Shared category
                  </p>
                  <p className="mt-2 text-xl font-semibold text-stone-950 dark:text-white">
                    Friday Movies
                  </p>
                </div>
                <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 dark:border-white/10 dark:text-stone-300">
                  MOVIENIGHT
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  "Dune: Part Two",
                  "Perfect Days",
                  "Past Lives",
                ].map((title, index) => (
                  <div
                    key={title}
                    className="flex items-center justify-between rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">{title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                        {index === 0 ? "In progress" : index === 1 ? "Planned" : "Done"}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-stone-950">
                      <MoonStar size={12} />
                      {index === 2 ? "9.2" : index === 0 ? "8.4" : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mt-8 grid gap-5 lg:grid-cols-3">
        {featureCards.map(({ title, description, icon: Icon }) => (
          <article
            key={title}
            className="rounded-[30px] border border-black/10 bg-[var(--panel)] p-5 shadow-[0_18px_50px_rgba(20,20,20,0.05)] dark:border-white/10 sm:p-6"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-stone-50 text-stone-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              <Icon size={20} />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-stone-950 dark:text-white">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
              {description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
