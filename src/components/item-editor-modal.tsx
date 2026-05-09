"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
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
  onDelete?: (value: ItemEditorValue) => void;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

export function ItemEditorModal({
  open,
  value,
  pending,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: ItemEditorModalProps) {
  useBodyScrollLock(open);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (!open || !value) {
    return null;
  }

  const statusOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/35 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(20,20,20,0.18)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-[var(--line)] p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                {value.mode === "create" ? "New card" : "Edit card"}
              </p>
              <h2 className="mt-2 truncate text-xl font-semibold text-stone-950 dark:text-white">
                {value.categoryName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-500 transition hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
              aria-label="Close card editor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
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
                blurBackdrop
                onChange={(status) =>
                  onChange({ ...value, status: status as MediaStatus })
                }
                options={statusOptions}
              />
            </label>

            <label className="block space-y-2">
              <FieldLabel>Your rating</FieldLabel>
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
          </div>

          <div className="shrink-0 border-t border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {value.mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => setConfirmDeleteOpen(true)}
                className="w-full justify-center sm:w-auto"
              >
                <Trash2 size={15} />
                Delete item
              </Button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="grid gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="order-2 w-full sm:order-1 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={pending}
              className="order-1 w-full sm:order-2 sm:w-auto"
            >
              {pending
                ? "Saving..."
                : value.mode === "create"
                  ? "Create card"
                  : "Save changes"}
            </Button>
            </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    {confirmDeleteOpen && value.mode === "edit" && onDelete ? (
      <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/60 p-3 backdrop-blur-md sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-rose-500/20 bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-rose-500/25 bg-rose-400/10 text-rose-200">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-950 dark:text-white">
                Delete item?
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                This will permanently remove this item.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              className="order-2 w-full sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                setConfirmDeleteOpen(false);
                onDelete(value);
              }}
              className="order-1 w-full sm:order-2"
            >
              <Trash2 size={15} />
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
