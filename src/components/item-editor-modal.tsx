"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { CategoryGlobalType, MediaStatus } from "@/types/app";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { getRatingColor } from "@/lib/utils";

export interface ItemEditorValue {
  mode: "create" | "edit";
  categoryId: string;
  categoryName: string;
  itemId?: string;
  title: string;
  status: MediaStatus;
  imageUrl: string;
  sourceUrl: string;
  rating: string;
}

interface ItemEditorModalProps {
  open: boolean;
  value: ItemEditorValue | null;
  categoryGlobalType: CategoryGlobalType;
  pending: boolean;
  onChange: (value: ItemEditorValue) => void;
  onClose: () => void;
  onSubmit: (value: ItemEditorValue) => void;
  onDelete?: (value: ItemEditorValue) => void;
}

interface ItemSuggestion {
  id: string;
  provider: "tmdb" | "igdb" | "shikimori" | "openlibrary";
  title: string;
  subtitle: string | null;
  imageUrl: string;
  sourceUrl: string;
  rating: number | null;
}

const providerName: Record<ItemSuggestion["provider"], string> = {
  tmdb: "TMDB",
  igdb: "IGDB",
  shikimori: "Shikimori",
  openlibrary: "Open Library",
};

const globalTypeSearchLabel: Record<CategoryGlobalType, string> = {
  movie: "TMDB",
  game: "IGDB",
  anime: "Shikimori",
  book: "Open Library",
  other: "Disabled",
};

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
  categoryGlobalType,
  pending,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: ItemEditorModalProps) {
  useBodyScrollLock(open);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsWarning, setSuggestionsWarning] = useState<string | null>(null);
  const [apiSuggestionsEnabled, setApiSuggestionsEnabled] = useState(true);
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([]);
  const [lockedSuggestion, setLockedSuggestion] = useState<ItemSuggestion | null>(null);
  const hasDraft = value !== null;
  const draftMode = value?.mode ?? "edit";
  const draftCategoryId = value?.categoryId ?? "";
  const draftTitle = value?.title ?? "";

  useEffect(() => {
    if (open) {
      return;
    }

    queueMicrotask(() => {
      setLockedSuggestion(null);
      setSuggestions([]);
      setSuggestionsWarning(null);
      setSuggestionsLoading(false);
    });
  }, [open]);

  useEffect(() => {
    if (!open || !hasDraft || draftMode !== "create") {
      return;
    }

    if (categoryGlobalType === "other") {
      return;
    }

    const query = draftTitle.trim();
    const isLockedBySelection =
      lockedSuggestion !== null && query === lockedSuggestion.title.trim();

    if (isLockedBySelection) {
      return;
    }

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsWarning(null);

      try {
        const response = await fetch(
          `/api/categories/${draftCategoryId}/suggestions?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as
          | {
              enabled?: boolean;
              warning?: string | null;
              suggestions?: ItemSuggestion[];
              error?: string;
            }
          | undefined;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to load suggestions.");
        }

        setApiSuggestionsEnabled(payload?.enabled !== false);
        setSuggestionsWarning(payload?.warning ?? null);
        setSuggestions(Array.isArray(payload?.suggestions) ? payload.suggestions : []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSuggestions([]);
        setSuggestionsWarning(
          error instanceof Error ? error.message : "Unable to load suggestions.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSuggestionsLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    categoryGlobalType,
    draftCategoryId,
    draftMode,
    draftTitle,
    hasDraft,
    lockedSuggestion,
    open,
  ]);

  if (!open || !value) {
    return null;
  }

  const canUseSuggestions = value.mode === "create" && categoryGlobalType !== "other";

  const statusOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));
  const ratingNumber = Number(value.rating);
  const hasRating = value.rating.trim() !== "" && Number.isFinite(ratingNumber);
  const sliderValue = hasRating ? Math.min(10, Math.max(0, ratingNumber)) : 5;
  const formattedRating = sliderValue.toFixed(1);
  const ratingColor = getRatingColor(hasRating ? sliderValue : null);

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/35 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(20,20,20,0.18)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-[var(--line)] p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                {value.mode === "create" ? "New card" : "Edit card"}
              </p>
              <h2 className="mt-2 truncate text-xl font-semibold text-stone-100">
                {value.categoryName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-400 transition hover:text-white"
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
              onChange={(event) => {
                const nextTitle = event.target.value;
                if (
                  lockedSuggestion &&
                  nextTitle.trim() !== lockedSuggestion.title.trim()
                ) {
                  setLockedSuggestion(null);
                }
                onChange({ ...value, title: nextTitle });
              }}
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
              <FieldLabel>Your rating</FieldLabel>
              <div className="flex h-11 items-center gap-3 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={sliderValue}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      rating: Number(event.target.value).toFixed(1),
                    })
                  }
                  className="rating-slider"
                  style={{ "--rating-accent": ratingColor } as CSSProperties}
                />
                <span className="w-11 text-right text-sm font-semibold" style={{ color: ratingColor }}>
                  {hasRating ? formattedRating : "—"}
                </span>
              </div>
            </label>
          </div>

          <label className="block space-y-2">
            <FieldLabel>Image URL (optional)</FieldLabel>
            <Input
              value={value.imageUrl}
              onChange={(event) =>
                onChange({ ...value, imageUrl: event.target.value })
              }
              placeholder="https://images.unsplash.com/... or leave empty"
            />
          </label>

          <label className="block space-y-2">
            <FieldLabel>Source link</FieldLabel>
            <Input
              value={value.sourceUrl}
              onChange={(event) =>
                onChange({ ...value, sourceUrl: event.target.value })
              }
              placeholder="https://example.com/original"
            />
          </label>

          {value.mode === "create" ? (
            <div className="space-y-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-100">
                  External suggestions: {globalTypeSearchLabel[categoryGlobalType]}
                </p>
              </div>

              {!canUseSuggestions || !apiSuggestionsEnabled ? (
                <p className="text-sm text-stone-300">
                  Suggestions are disabled for this category type.
                </p>
              ) : value.title.trim().length < 2 ? (
                <p className="text-sm text-stone-300">
                  Enter at least 2 characters in title to search TMDB / IGDB / Shikimori / Open Library.
                </p>
              ) : suggestionsLoading ? (
                <p className="text-sm text-stone-300">Searching suggestions...</p>
              ) : suggestionsWarning ? (
                <p className="text-sm text-amber-300">{suggestionsWarning}</p>
              ) : suggestions.length ? (
                <div className="grid gap-2 overflow-x-hidden">
                  {(lockedSuggestion ? [lockedSuggestion] : suggestions).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        setLockedSuggestion(suggestion);
                        onChange({
                          ...value,
                          title: suggestion.title,
                          imageUrl: suggestion.imageUrl,
                          sourceUrl: suggestion.sourceUrl,
                          rating:
                            value.rating.trim() !== "" || suggestion.rating === null
                              ? value.rating
                              : suggestion.rating.toFixed(1),
                        });
                      }}
                      className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] p-2 text-left transition hover:border-white/20 hover:bg-[var(--muted-strong)]"
                    >
                      {suggestion.imageUrl ? (
                        <Image
                          src={suggestion.imageUrl}
                          alt={suggestion.title}
                          width={48}
                          height={64}
                          className="h-16 w-12 shrink-0 rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded border border-[var(--line)] bg-[var(--muted)] text-[10px] uppercase text-stone-400">
                          No img
                        </div>
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold text-stone-100">
                          {suggestion.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-stone-300">
                          {suggestion.subtitle ?? providerName[suggestion.provider]}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-stone-400">
                          {providerName[suggestion.provider]}
                          {suggestion.rating !== null ? ` • ${suggestion.rating.toFixed(1)}` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-300">No suggestions found.</p>
              )}
            </div>
          ) : null}
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
              <h3 className="text-lg font-semibold text-stone-100">
                Delete item?
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-300">
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

