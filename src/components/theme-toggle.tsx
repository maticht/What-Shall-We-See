"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/85 text-stone-700 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-black/15 hover:text-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:border-white/20 dark:hover:text-white"
      aria-label="Toggle color theme"
    >
      <SunMedium size={18} className="hidden dark:block" />
      <MoonStar size={18} className="block dark:hidden" />
    </button>
  );
}
