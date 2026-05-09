import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(20,20,20,0.035)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
