"use client";

import Link from "next/link";
import { LogIn, LogOut, LoaderCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function SignInButton({
  className,
  label = "Continue with Google",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href="/api/auth/signin/google?callbackUrl=%2Fdashboard"
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-black/10 bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(25,25,25,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200",
        className,
      )}
    >
      <LogIn size={16} />
      {label}
    </Link>
  );
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: "/" });
        })
      }
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:text-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:border-white/20 dark:hover:text-white"
      disabled={pending}
    >
      {pending ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />}
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
