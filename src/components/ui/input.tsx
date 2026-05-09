import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-white/30",
        className,
      )}
      {...props}
    />
  );
}
