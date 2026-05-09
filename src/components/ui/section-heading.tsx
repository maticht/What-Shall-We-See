import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-stone-500 dark:text-stone-400">
          {icon}
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn("mt-2 text-xl font-semibold tracking-tight text-stone-950 dark:text-white")}>
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {description}
        </p>
      ) : null}
    </div>
  );
}
