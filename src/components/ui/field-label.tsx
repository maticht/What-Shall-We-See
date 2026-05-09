import type { ReactNode } from "react";

export function FieldLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
      {children}
    </span>
  );
}
