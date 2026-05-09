import type { MediaStatus } from "@/types/app";
import { cn, formatStatus } from "@/lib/utils";

const toneMap: Record<MediaStatus, string> = {
  planned:
    "border-amber-200 bg-amber-100/80 text-amber-900 dark:border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-200",
  in_progress:
    "border-sky-200 bg-sky-100/80 text-sky-900 dark:border-sky-500/20 dark:bg-sky-400/10 dark:text-sky-200",
  done: "border-emerald-200 bg-emerald-100/80 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-200",
};

export function StatusBadge({ status }: { status: MediaStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-ui)] border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase",
        toneMap[status],
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
