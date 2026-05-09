"use client";

import { X } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { MediaStatus } from "@/types/app";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";

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

  const statusOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/35 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_18px_56px_rgba(20,20,20,0.18)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
              {value.mode === "create" ? "New card" : "Edit card"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950 dark:text-white">
              {value.categoryName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-500 transition hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
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
            <FieldLabel>Title</FieldLabel>
            <Input
              value={value.title}
              onChange={(event) =>
                onChange({ ...value, title: event.target.value })
              }
              placeholder="The Left Hand of Darkness"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <FieldLabel>Status</FieldLabel>
              <CustomSelect
                value={value.status}
                onChange={(status) =>
                  onChange({ ...value, status: status as MediaStatus })
                }
                options={statusOptions}
              />
            </label>

            <label className="block space-y-2">
              <FieldLabel>Rating</FieldLabel>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={value.rating}
                onChange={(event) =>
                  onChange({ ...value, rating: event.target.value })
                }
                placeholder="8.5"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <FieldLabel>Image URL</FieldLabel>
            <Input
              value={value.imageUrl}
              onChange={(event) =>
                onChange({ ...value, imageUrl: event.target.value })
              }
              placeholder="https://images.unsplash.com/..."
            />
          </label>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending
                ? "Saving..."
                : value.mode === "create"
                  ? "Create card"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
