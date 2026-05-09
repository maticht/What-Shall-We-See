"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryEditorValue {
  mode: "create" | "edit";
  categoryId?: string;
  name: string;
  scope: "personal" | "shared";
  connectionKey: string;
}

interface CategoryEditorModalProps {
  open: boolean;
  value: CategoryEditorValue | null;
  connections: string[];
  pending: boolean;
  onChange: (value: CategoryEditorValue) => void;
  onClose: () => void;
  onSubmit: (value: CategoryEditorValue) => void;
}

export function CategoryEditorModal({
  open,
  value,
  connections,
  pending,
  onChange,
  onClose,
  onSubmit,
}: CategoryEditorModalProps) {
  if (!open || !value) {
    return null;
  }

  const isShared = value.scope === "shared";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-[28px] border border-black/10 bg-[var(--panel)] p-6 shadow-[0_30px_90px_rgba(20,20,20,0.22)] dark:border-white/10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400">
              {value.mode === "create" ? "New category" : "Edit category"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
              {value.mode === "create"
                ? "Shape a new shelf"
                : "Refine this category"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 text-stone-500 transition hover:text-stone-950 dark:border-white/10 dark:text-stone-400 dark:hover:text-white"
            aria-label="Close category editor"
          >
            <X size={18} />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
              Category name
            </span>
            <input
              value={value.name}
              onChange={(event) =>
                onChange({ ...value, name: event.target.value })
              }
              placeholder="Weekend movies"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Scope
              </span>
              <select
                value={value.scope}
                disabled={value.mode === "edit"}
                onChange={(event) =>
                  onChange({
                    ...value,
                    scope: event.target.value as "personal" | "shared",
                    connectionKey:
                      event.target.value === "shared"
                        ? value.connectionKey || connections[0] || ""
                        : "",
                  })
                }
                className={cn(
                  "w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white",
                  value.mode === "edit" && "cursor-not-allowed opacity-70",
                )}
              >
                <option value="personal">Personal</option>
                <option value="shared">Shared</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Connection
              </span>
              <select
                value={value.connectionKey}
                disabled={!isShared || connections.length === 0 || value.mode === "edit"}
                onChange={(event) =>
                  onChange({ ...value, connectionKey: event.target.value })
                }
                className={cn(
                  "w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white",
                  (!isShared || connections.length === 0 || value.mode === "edit") &&
                    "cursor-not-allowed opacity-70",
                )}
              >
                {connections.length ? (
                  connections.map((connection) => (
                    <option key={connection} value={connection}>
                      {connection}
                    </option>
                  ))
                ) : (
                  <option value="">No shared connection yet</option>
                )}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-dashed border-black/10 bg-stone-50/80 p-4 text-sm text-stone-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
            Personal categories belong only to you. Shared categories are visible
            to everyone using the same connection code.
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-stone-700 transition hover:text-stone-950 dark:border-white/10 dark:text-stone-300 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-70 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
            >
              {pending
                ? "Saving..."
                : value.mode === "create"
                  ? "Create category"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
