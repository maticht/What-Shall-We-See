"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Grid2X2,
  Grid3X3,
  LayoutList,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { ItemEditorModal, type ItemEditorValue } from "@/components/item-editor-modal";
import { SignOutButton, SignedInIndicator } from "@/components/auth-buttons";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { ToastStack, type ToastMessage } from "@/components/ui/toast-stack";
import { cn, formatRating } from "@/lib/utils";
import type {
  CategoryData,
  DashboardUser,
  MediaItemData,
  PaginatedItemsData,
} from "@/types/app";

type SortKey = "updated_desc" | "title_asc" | "status_asc" | "rating_desc";
type ViewMode = "list" | "grid2" | "grid3";
type StatusFilter = "all" | "planned" | "in_progress" | "done";
type RatingFilter = "all" | "rated" | "unrated" | "high" | "low";

const PAGE_SIZE = 50;

const sortOptions = [
  {
    value: "updated_desc",
    label: "Recently updated",
    description: "Newest changes first.",
  },
  {
    value: "title_asc",
    label: "Title A-Z",
    description: "Alphabetical order.",
  },
  {
    value: "status_asc",
    label: "Status",
    description: "Planned, active, done.",
  },
  {
    value: "rating_desc",
    label: "Rating high-low",
    description: "Your rating first.",
  },
];

const statusFilterOptions = [
  { value: "all", label: "All statuses", description: "Any status." },
  { value: "planned", label: "Planned", description: "Only planned." },
  { value: "in_progress", label: "In progress", description: "Only in progress." },
  { value: "done", label: "Done", description: "Only done." },
];

const ratingFilterOptions = [
  { value: "all", label: "All ratings", description: "Any rating." },
  { value: "rated", label: "Rated only", description: "Has rating value." },
  { value: "unrated", label: "Unrated only", description: "No rating yet." },
  { value: "high", label: "7+ only", description: "Rating 7 and above." },
  { value: "low", label: "Below 7", description: "Rating below 7." },
];

const statusRank = {
  planned: 0,
  in_progress: 1,
  done: 2,
};

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? "Request failed.");
  }

  return response;
}

async function requestPage(url: string): Promise<PaginatedItemsData> {
  const response = await requestJson(url);
  return (await response.json()) as PaginatedItemsData;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildCreateItemDraft(category: CategoryData): ItemEditorValue {
  return {
    mode: "create",
    categoryId: category.id,
    categoryName: `${category.emoji} ${category.name}`,
    title: "",
    status: "planned",
    imageUrl: "",
    sourceUrl: "",
    rating: "",
  };
}

function buildEditItemDraft(category: CategoryData, item: MediaItemData): ItemEditorValue {
  return {
    mode: "edit",
    categoryId: category.id,
    categoryName: `${category.emoji} ${category.name}`,
    itemId: item.id,
    title: item.title,
    status: item.status,
    imageUrl: item.imageUrl,
    sourceUrl: item.sourceUrl ?? "",
    rating: item.myRating === null ? "" : String(item.myRating),
  };
}

function RatingLine({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const toneClass =
    value === null
      ? "border-[var(--line)] bg-[var(--muted)] text-stone-200"
      : value < 2.5
        ? "border-rose-500/35 bg-rose-500/12 text-rose-200"
        : value < 4.5
          ? "border-orange-500/35 bg-orange-500/12 text-orange-200"
          : value < 6.5
            ? "border-amber-500/35 bg-amber-500/12 text-amber-200"
            : value < 8.5
              ? "border-lime-500/35 bg-lime-500/12 text-lime-200"
              : "border-emerald-500/35 bg-emerald-500/12 text-emerald-200";

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-[var(--radius-ui)] border px-2 py-1 text-xs font-medium", toneClass)}>
      <span className="text-white/70">{label}:</span>
      <span>{formatRating(value)}</span>
    </div>
  );
}

function ItemCard({
  item,
  viewMode,
  isShared,
  onEdit,
}: {
  item: MediaItemData;
  viewMode: ViewMode;
  isShared: boolean;
  onEdit: () => void;
}) {
  const isList = viewMode === "list";

  return (
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)]">
      <div className={isList ? "grid gap-0 sm:grid-cols-[170px_1fr]" : "grid gap-0"}>
        <div
          className={
            isList
              ? "relative aspect-[4/3] w-full bg-[var(--muted-strong)] sm:aspect-auto sm:min-h-40"
              : "relative aspect-[4/3] w-full bg-[var(--muted-strong)]"
          }
        >
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            unoptimized
            sizes={
              isList
                ? "(max-width: 640px) 100vw, 170px"
                : "(max-width: 768px) 100vw, 50vw"
            }
            className="object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-stone-100">
                  {item.title}
                </h3>
              </div>
              <StatusBadge status={item.status} className="self-start" />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <RatingLine label="You" value={item.myRating} />
              {isShared ? (
                <RatingLine label={item.partnerLabel ?? "Partner"} value={item.partnerRating} />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] px-3 py-2 text-sm font-medium text-stone-100 transition hover:border-white/20 hover:text-white"
              >
                <ExternalLink size={14} />
                Source
              </a>
            ) : null}
            <Button type="button" variant="secondary" onClick={onEdit}>
              <Pencil size={15} />
              Edit
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CategoryPageShell({
  user,
  category,
  firstPage,
}: {
  user: DashboardUser;
  category: CategoryData;
  firstPage: PaginatedItemsData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingPage, setLoadingPage] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounter = useRef(0);
  const [itemDraft, setItemDraft] = useState<ItemEditorValue | null>(null);
  const [pageItems, setPageItems] = useState<MediaItemData[]>(firstPage.items);
  const [totalItems, setTotalItems] = useState(firstPage.total);
  const [currentPage, setCurrentPage] = useState(
    Math.floor(firstPage.offset / Math.max(firstPage.limit, 1)) + 1,
  );

  const isSharedCategory = category.scope === "shared";
  const hasItems = totalItems > 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const pushToast = (tone: ToastMessage["tone"], text: string) => {
    toastCounter.current += 1;
    const id = `toast-${toastCounter.current}`;
    setToasts((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = pageItems.filter((item) => {
      if (normalizedQuery && !item.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      const score = item.myRating;

      if (ratingFilter === "rated" && score === null) {
        return false;
      }

      if (ratingFilter === "unrated" && score !== null) {
        return false;
      }

      if (ratingFilter === "high" && (score === null || score < 7)) {
        return false;
      }

      if (ratingFilter === "low" && (score === null || score >= 7)) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      switch (sort) {
        case "title_asc":
          return left.title.localeCompare(right.title);
        case "status_asc":
          return statusRank[left.status] - statusRank[right.status];
        case "rating_desc":
          return (right.myRating ?? -1) - (left.myRating ?? -1);
        case "updated_desc":
        default:
          return right.updatedAt.localeCompare(left.updatedAt);
      }
    });
  }, [pageItems, query, sort, statusFilter, ratingFilter]);

  const loadPage = async (pageNumber: number) => {
    const boundedPage = Math.max(1, Math.min(pageNumber, totalPages));
    const offset = (boundedPage - 1) * PAGE_SIZE;

    setLoadingPage(true);

    try {
      const data = await requestPage(
        `/api/categories/${category.id}/items?offset=${offset}&limit=${PAGE_SIZE}&range=${offset}:${offset + PAGE_SIZE - 1}`,
      );

      setPageItems(data.items);
      setTotalItems(data.total);
      setCurrentPage(Math.floor(data.offset / Math.max(data.limit, 1)) + 1);
    } catch (pageError) {
      pushToast(
        "error",
        pageError instanceof Error ? pageError.message : "Unable to load page.",
      );
    } finally {
      setLoadingPage(false);
    }
  };

  const runMutation = (work: () => Promise<void>, successMessage: string) => {
    startTransition(async () => {
      try {
        await work();
        await loadPage(1);
        pushToast("success", successMessage);
        router.refresh();
      } catch (mutationError) {
        pushToast(
          "error",
          mutationError instanceof Error
            ? mutationError.message
            : "Something went wrong.",
        );
      }
    });
  };

  const submitItemDraft = (draft: ItemEditorValue) => {
    runMutation(
      async () => {
        if (draft.mode === "create") {
          await requestJson(`/api/categories/${draft.categoryId}/items`, {
            method: "POST",
            body: JSON.stringify({
              title: draft.title,
              status: draft.status,
              imageUrl: draft.imageUrl,
              sourceUrl: draft.sourceUrl,
              rating: draft.rating,
            }),
          });
        } else if (draft.itemId) {
          await requestJson(`/api/categories/${draft.categoryId}/items/${draft.itemId}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: draft.title,
              status: draft.status,
              imageUrl: draft.imageUrl,
              sourceUrl: draft.sourceUrl,
              rating: draft.rating,
            }),
          });
        }

        setItemDraft(null);
      },
      draft.mode === "create" ? "Item created." : "Item updated.",
    );
  };

  const deleteFromDraft = (draft: ItemEditorValue) => {
    if (!draft.itemId) {
      return;
    }

    runMutation(
      async () => {
        await requestJson(`/api/categories/${draft.categoryId}/items/${draft.itemId}`, {
          method: "DELETE",
        });
        setItemDraft(null);
      },
      "Item removed.",
    );
  };

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Surface className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-white"
              >
                <ArrowLeft size={15} />
                Back to categories
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {category.scope}
                </p>
                {category.connectionKey ? (
                  <span className="rounded-[var(--radius-ui)] border border-[var(--line)] px-2 py-1 text-xs text-stone-300">
                    {category.connectionKey}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] text-2xl">
                  {category.emoji}
                </div>
                <h1 className="min-w-0 text-2xl font-semibold text-stone-100">
                  {category.name}
                </h1>
              </div>
              <p className="mt-2 text-sm text-stone-300">
                {totalItems} {totalItems === 1 ? "item" : "items"} in this category. Signed in as {user.name}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!hasItems ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setItemDraft(buildCreateItemDraft(category))}
                  disabled={pending || loadingPage}
                >
                  <Plus size={16} />
                  New item
                </Button>
              ) : null}
              <SignedInIndicator />
              <SignOutButton />
            </div>
          </div>
        </Surface>

        {hasItems ? (
        <Surface className="sticky top-2 z-20 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-stone-100"
            >
              Filters & sort
              {mobileFiltersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setItemDraft(buildCreateItemDraft(category))}
              disabled={pending || loadingPage}
            >
              <Plus size={16} />
              New
            </Button>
          </div>

          <div className={`${mobileFiltersOpen ? "mt-3 grid" : "hidden"} gap-3 sm:mt-0 sm:grid`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-[1fr_200px_180px_180px]">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-200">
                    <Search size={15} />
                    Search on this page
                  </span>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search items"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-200">
                    Sort
                  </span>
                  <CustomSelect
                    value={sort}
                    options={sortOptions}
                    onChange={(value) => setSort(value as SortKey)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-200">
                    Status
                  </span>
                  <CustomSelect
                    value={statusFilter}
                    options={statusFilterOptions}
                    onChange={(value) => setStatusFilter(value as StatusFilter)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-200">
                    Rating
                  </span>
                  <CustomSelect
                    value={ratingFilter}
                    options={ratingFilterOptions}
                    onChange={(value) => setRatingFilter(value as RatingFilter)}
                  />
                </label>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => setItemDraft(buildCreateItemDraft(category))}
                disabled={pending || loadingPage}
                className="hidden sm:inline-flex"
              >
                <Plus size={16} />
                New item
              </Button>
            </div>
          </div>
        </Surface>
        ) : null}

        {hasItems ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isSharedCategory ? (
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-stone-300">
              <span className="font-medium text-stone-200">Last update:</span>
              <span>{category.lastEditedByName ?? "Unknown"}</span>
              <span>•</span>
              <span>{formatDate(category.updatedAt)}</span>
            </div>
          ) : (
            <span className="text-sm text-stone-400">
              {visibleItems.length} visible
            </span>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            <div className="inline-flex rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex h-9 items-center gap-2 rounded-[var(--radius-ui)] px-3 text-sm font-medium transition ${
                  viewMode === "list"
                    ? "bg-[var(--muted-strong)] text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <LayoutList size={15} />
                1
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid2")}
                className={`inline-flex h-9 items-center gap-2 rounded-[var(--radius-ui)] px-3 text-sm font-medium transition ${
                  viewMode === "grid2"
                    ? "bg-[var(--muted-strong)] text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <Grid2X2 size={15} />
                2
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid3")}
                className={`inline-flex h-9 items-center gap-2 rounded-[var(--radius-ui)] px-3 text-sm font-medium transition ${
                  viewMode === "grid3"
                    ? "bg-[var(--muted-strong)] text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <Grid3X3 size={15} />
                3
              </button>
            </div>
          </div>
        </div>
        ) : null}

        <section
          className={`grid gap-3 ${
            viewMode === "grid2"
              ? "md:grid-cols-2"
              : viewMode === "grid3"
                ? "md:grid-cols-2 xl:grid-cols-3"
                : ""
          }`}
        >
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                isShared={isSharedCategory}
                onEdit={() => setItemDraft(buildEditItemDraft(category, item))}
              />
            ))
          ) : (
            <Surface className="p-5">
              <p className="font-medium text-stone-100">
                {totalItems === 0 ? "No items yet." : "No items found."}
              </p>
              <p className="mt-2 text-sm text-stone-300">
                {totalItems === 0
                  ? "Add the first item to this category."
                  : "Adjust your search or filters."}
              </p>
              {totalItems === 0 ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setItemDraft(buildCreateItemDraft(category))}
                    disabled={pending || loadingPage}
                  >
                    <Plus size={16} />
                    Add first item
                  </Button>
                </div>
              ) : null}
            </Surface>
          )}
        </section>

        {hasItems ? (
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)]">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center text-stone-300 transition hover:text-white disabled:opacity-40"
              onClick={() => loadPage(currentPage - 1)}
              disabled={pending || loadingPage || currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-16 px-2 text-center text-sm font-medium text-stone-200">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center text-stone-300 transition hover:text-white disabled:opacity-40"
              onClick={() => loadPage(currentPage + 1)}
              disabled={pending || loadingPage || currentPage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        ) : null}
      </main>

      <ItemEditorModal
        open={Boolean(itemDraft)}
        value={itemDraft}
        pending={pending || loadingPage}
        onChange={setItemDraft}
        onClose={() => setItemDraft(null)}
        onSubmit={submitItemDraft}
        onDelete={deleteFromDraft}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}
