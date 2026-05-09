"use client";

import { X } from "lucide-react";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { MediaStatus } from "@/types/app";

export interface ItemEditorValue {
  mode: "create" | "edit";
  categoryId: string;
  categoryName: string;
  itemId?: string;
  title: string;
  status: MediaStatus;
  imageUrl: string;
  rating: string;
}

interface ItemEditorModalProps {
  open: boolean;
  value: ItemEditorValue | null;
  pending: boolean;
  onChange: (value: ItemEditorValue) => void;
  onClose: () => void;
  onSubmit: (value: ItemEditorValue) => void;
}

export function ItemEditorModal({
  open,
  value,
  pending,
  onChange,
  onClose,
  onSubmit,
}: ItemEditorModalProps) {
  if (!open || !value) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-[28px] border border-black/10 bg-[var(--panel)] p-6 shadow-[0_30px_90px_rgba(20,20,20,0.22)] dark:border-white/10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400">
              {value.mode === "create" ? "New card" : "Edit card"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
              {value.categoryName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 text-stone-500 transition hover:text-stone-950 dark:border-white/10 dark:text-stone-400 dark:hover:text-white"
            aria-label="Close card editor"
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
              Title
            </span>
            <input
              value={value.title}
              onChange={(event) =>
                onChange({ ...value, title: event.target.value })
              }
              placeholder="The Left Hand of Darkness"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Status
              </span>
              <select
                value={value.status}
                onChange={(event) =>
                  onChange({ ...value, status: event.target.value as MediaStatus })
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Rating
              </span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={value.rating}
                onChange={(event) =>
                  onChange({ ...value, rating: event.target.value })
                }
                placeholder="8.5"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
              Image URL
            </span>
            <input
              value={value.imageUrl}
              onChange={(event) =>
                onChange({ ...value, imageUrl: event.target.value })
              }
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onChange({ ...value, status: option.value })
                }
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  value.status === option.value
                    ? "border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950"
                    : "border-black/10 bg-stone-50/80 text-stone-700 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300"
                }`}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs opacity-75">{option.description}</p>
              </button>
            ))}
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
                  ? "Create card"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
