import type { MediaStatus } from "@/types/app";
import { cn, formatStatus } from "@/lib/utils";

const toneMap: Record<MediaStatus, string> = {
  planned:
    "border-stone-500/35 bg-stone-500/12 text-stone-200",
  in_progress:
    "border-sky-500/35 bg-sky-500/12 text-sky-200",
  done: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  dropped: "border-rose-500/35 bg-rose-500/12 text-rose-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: MediaStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex self-start items-center rounded-[var(--radius-ui)] border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase",
        toneMap[status],
        className,
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
