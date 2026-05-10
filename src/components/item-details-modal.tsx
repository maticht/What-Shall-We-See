"use client";

import Image from "next/image";
import { useEffect, useState, type MouseEvent } from "react";
import { ExternalLink, Pencil, X } from "lucide-react";
import { formatStatus, getRatingColor } from "@/lib/utils";
import type { CategoryGlobalType, MediaItemData } from "@/types/app";

interface ItemDetailsModalProps {
  open: boolean;
  categoryId: string;
  categoryGlobalType: CategoryGlobalType;
  item: MediaItemData | null;
  onClose: () => void;
  onEdit: () => void;
  onQuickRate: (event: MouseEvent<HTMLDivElement>) => void;
}

interface DetailsPayload {
  item: MediaItemData;
  globalType: CategoryGlobalType;
  external: {
    provider: "tmdb" | "igdb" | "shikimori" | "openlibrary" | "none";
    title: string | null;
    description: string | null;
    globalRating: number | null;
    year: string | null;
    author: string | null;
    genres: string[];
    imageUrl: string;
    sourceUrl: string | null;
    extras: Array<{ label: string; value: string }>;
  };
}

const providerLabel: Record<DetailsPayload["external"]["provider"], string> = {
  tmdb: "TMDB",
  igdb: "IGDB",
  shikimori: "Shikimori",
  openlibrary: "Open Library",
  none: "Manual",
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

function formatMaybeRating(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function formatMaybeValue(value: string | null) {
  return value ?? "—";
}

function findExtraValue(
  extras: Array<{ label: string; value: string }> | undefined,
  labels: string[],
) {
  const entry = (extras ?? []).find((item) =>
    labels.some((label) => item.label.toLowerCase() === label.toLowerCase()),
  );
  return entry?.value ?? null;
}

function hasValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return false;
  }

  return value.trim().length > 0;
}

function ratingPillStyle(value: number | null) {
  const accent = getRatingColor(value);

  return {
    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.82), rgba(0,0,0,0.66)), linear-gradient(135deg, ${accent}44, ${accent}1f)`,
    borderColor: `${accent}88`,
    boxShadow: `0 0 0 1px ${accent}22 inset`,
  };
}

export function ItemDetailsModal({
  open,
  categoryId,
  categoryGlobalType,
  item,
  onClose,
  onEdit,
  onQuickRate,
}: ItemDetailsModalProps) {
  useBodyScrollLock(open);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsPayload | null>(null);

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    const controller = new AbortController();

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });

    fetch(
      `/api/categories/${categoryId}/items/${item.id}/details`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const payload = (await response.json()) as
          | DetailsPayload
          | { error?: string };

        if (!response.ok) {
          throw new Error((payload as { error?: string }).error ?? "Unable to load details.");
        }

        setDetails(payload as DetailsPayload);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load details.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [categoryId, item, open]);

  if (!open || !item) {
    return null;
  }

  const external = details?.external ?? null;
  const cover = external?.imageUrl || item.imageUrl;
  const title = external?.title || item.title;
  const sourceUrl = external?.sourceUrl || item.sourceUrl;
  const episodesValue = findExtraValue(external?.extras, ["Episodes"]);
  const durationValue = findExtraValue(external?.extras, ["Duration", "Runtime"]);
  const pagesValue = findExtraValue(external?.extras, ["Pages", "Page count"]);
  const platformsValue = findExtraValue(external?.extras, ["Platforms", "Platform"]);
  const publisherValue = findExtraValue(external?.extras, ["Publisher"]);
  const usedExtraLabels = new Set<string>();
  const registerUsedLabels = (labels: string[]) => {
    labels.forEach((label) => usedExtraLabels.add(label.toLowerCase()));
  };
  const primaryStats: Array<{ label: string; value: string }> = [];

  if (categoryGlobalType === "movie" || categoryGlobalType === "anime") {
    if (hasValue(episodesValue)) {
      primaryStats.push({ label: "Episodes", value: episodesValue! });
      registerUsedLabels(["Episodes"]);
    }

    if (hasValue(durationValue)) {
      primaryStats.push({ label: "Duration", value: durationValue! });
      registerUsedLabels(["Duration", "Runtime"]);
    }
  }

  if (categoryGlobalType === "game" && hasValue(platformsValue)) {
    primaryStats.push({ label: "Platforms", value: platformsValue! });
    registerUsedLabels(["Platforms", "Platform"]);
  }

  if (categoryGlobalType === "book" && hasValue(pagesValue)) {
    primaryStats.push({ label: "Pages", value: pagesValue! });
    registerUsedLabels(["Pages", "Page count"]);
  }

  if (hasValue(external?.year ?? null)) {
    primaryStats.push({ label: "Year", value: external?.year ?? "" });
  }

  if (categoryGlobalType === "book" && hasValue(publisherValue)) {
    primaryStats.push({ label: "Publisher", value: publisherValue! });
    registerUsedLabels(["Publisher"]);
  }

  if (hasValue(external?.author ?? null)) {
    primaryStats.push({
      label: categoryGlobalType === "game" ? "Studio" : "Author / Creator",
      value: external?.author ?? "",
    });
  }

  primaryStats.push({ label: "Your status", value: formatStatus(item.status) });

  const remainingExtras = (external?.extras ?? []).filter(
    (entry) => !usedExtraLabels.has(entry.label.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(20,20,20,0.18)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-[var(--line)] p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                Item details
              </p>
              <h2 className="mt-2 truncate text-xl font-semibold text-stone-100">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] px-3 text-sm font-medium text-stone-200 transition hover:border-white/20 hover:text-white"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-400 transition hover:text-white"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid items-start gap-4 md:grid-cols-[210px_1fr]">
            <div className="relative self-start overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)]">
              {cover ? (
                <Image
                  src={cover}
                  alt={title}
                  width={420}
                  height={630}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-sm text-stone-400">
                  No cover
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex flex-col gap-1.5">
                <div
                  className="rounded-[var(--radius-ui)] border px-2 py-1 text-[11px] font-semibold text-white backdrop-blur"
                  style={ratingPillStyle(external?.globalRating ?? null)}
                >
                  Global: {formatMaybeRating(external?.globalRating ?? null)}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onQuickRate(event);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onQuickRate(event as unknown as MouseEvent<HTMLDivElement>);
                    }
                  }}
                  className="rounded-[var(--radius-ui)] border px-2 py-1 text-[11px] font-semibold text-white backdrop-blur"
                  style={ratingPillStyle(item.myRating)}
                >
                  You: {formatMaybeRating(item.myRating)}
                </div>
                {item.partnerLabel || item.partnerRating !== null ? (
                  <div
                    className="rounded-[var(--radius-ui)] border px-2 py-1 text-[11px] font-semibold text-white backdrop-blur"
                    style={ratingPillStyle(item.partnerRating)}
                  >
                    {(item.partnerLabel ?? "Partner")}: {formatMaybeRating(item.partnerRating)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-[var(--radius-ui)] border border-[var(--line)] px-2 py-1 text-xs text-stone-300">
                  Source: {external ? providerLabel[external.provider] : "Manual"}
                </span>
                <span className="rounded-[var(--radius-ui)] border border-[var(--line)] px-2 py-1 text-xs text-stone-300">
                  Category: {categoryGlobalType}
                </span>
              </div>

              {primaryStats.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {primaryStats.map((entry) => (
                    <div
                      key={`${entry.label}-${entry.value}`}
                      className="rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3 py-2"
                    >
                      <p className="text-xs uppercase tracking-[0.12em] text-stone-400">{entry.label}</p>
                      <p className="mt-1 text-sm font-semibold text-stone-100">
                        {formatMaybeValue(entry.value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {external?.genres?.length ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-stone-400">Genres</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {external.genres.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-xs text-stone-200"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {remainingExtras.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {remainingExtras.map((entry) => (
                    <div
                      key={`${entry.label}-${entry.value}`}
                      className="rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3 py-2"
                    >
                      <p className="text-xs uppercase tracking-[0.12em] text-stone-400">{entry.label}</p>
                      <p className="mt-1 text-sm font-semibold text-stone-100">{entry.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {loading ? <p className="text-sm text-stone-300">Loading details...</p> : null}
              {error ? <p className="text-sm text-amber-300">{error}</p> : null}
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-stone-400">Description</p>
            <p className="text-sm leading-6 text-stone-200">
              {external?.description || "No description available."}
            </p>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] px-3 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:text-white"
              >
                <ExternalLink size={14} />
                Open source page
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
