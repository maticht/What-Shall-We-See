"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Grid2X2, LayoutList, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { ItemEditorModal, type ItemEditorValue } from "@/components/item-editor-modal";
import { SignOutButton } from "@/components/auth-buttons";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { formatRating } from "@/lib/utils";
import type { CategoryData, DashboardUser, MediaItemData } from "@/types/app";

type SortKey = "updated_desc" | "title_asc" | "status_asc" | "rating_desc";
type ViewMode = "list" | "grid2" | "grid3";

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
    description: "Highest scores first.",
  },
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
    categoryName: category.name,
    title: "",
    status: "planned",
    imageUrl: "",
    rating: "",
  };
}

function buildEditItemDraft(category: CategoryData, item: MediaItemData): ItemEditorValue {
  return {
    mode: "edit",
    categoryId: category.id,
    categoryName: category.name,
    itemId: item.id,
    title: item.title,
    status: item.status,
    imageUrl: item.imageUrl,
    rating: item.rating === null ? "" : String(item.rating),
  };
}

function ItemCard({
  item,
  viewMode,
  onEdit,
  onDelete,
}: {
  item: MediaItemData;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isList = viewMode === "list";

  return (
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)]">
      <div className={isList ? "grid gap-0 sm:grid-cols-[140px_1fr]" : "grid gap-0"}>
        <div className={isList ? "relative aspect-[4/3] w-full bg-[var(--muted-strong)] sm:aspect-auto sm:min-h-36" : "relative aspect-[4/3] w-full bg-[var(--muted-strong)]"}>
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            unoptimized
            sizes={
              isList
                ? "(max-width: 640px) 100vw, 140px"
                : "(max-width: 768px) 100vw, 50vw"
            }
            className="object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-stone-950 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Updated {formatDate(item.updatedAt)}
                  {item.updatedByName ? ` by ${item.updatedByName}` : ""}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="mt-3 inline-flex items-center gap-1 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] px-2.5 py-1 text-sm font-medium text-stone-800 dark:text-stone-100">
              <Star size={14} />
              {formatRating(item.rating)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onEdit}>
              <Pencil size={15} />
              Edit
            </Button>
            <Button type="button" variant="danger" onClick={onDelete}>
              <Trash2 size={15} />
              Remove
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
}: {
  user: DashboardUser;
  category: CategoryData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemEditorValue | null>(null);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = category.items.filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return item.title.toLowerCase().includes(normalizedQuery);
    });

    return [...filtered].sort((left, right) => {
      switch (sort) {
        case "title_asc":
          return left.title.localeCompare(right.title);
        case "status_asc":
          return statusRank[left.status] - statusRank[right.status];
        case "rating_desc":
          return (right.rating ?? -1) - (left.rating ?? -1);
        case "updated_desc":
        default:
          return right.updatedAt.localeCompare(left.updatedAt);
      }
    });
  }, [category.items, query, sort]);

  const lastEditor = category.lastEditedByName ?? "Unknown";

  const runMutation = (work: () => Promise<void>, successMessage: string) => {
    setError(null);

    startTransition(async () => {
      try {
        await work();
        setNotice(successMessage);
        router.refresh();
      } catch (mutationError) {
        setError(
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
              rating: draft.rating,
            }),
          });
        } else if (draft.itemId) {
          await requestJson(
            `/api/categories/${draft.categoryId}/items/${draft.itemId}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                title: draft.title,
                status: draft.status,
                imageUrl: draft.imageUrl,
                rating: draft.rating,
              }),
            },
          );
        }

        setItemDraft(null);
      },
      draft.mode === "create" ? "Item created." : "Item updated.",
    );
  };

  const deleteItem = (item: MediaItemData) => {
    runMutation(
      async () => {
        await requestJson(`/api/categories/${category.id}/items/${item.id}`, {
          method: "DELETE",
        });
      },
      `"${item.title}" removed.`,
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
                className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
              >
                <ArrowLeft size={15} />
                Back to categories
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  {category.scope}
                </p>
                {category.connectionKey ? (
                  <span className="rounded-[var(--radius-ui)] border border-[var(--line)] px-2 py-1 text-xs text-stone-600 dark:text-stone-300">
                    {category.connectionKey}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
                {category.name}
              </h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                {category.items.length} {category.items.length === 1 ? "item" : "items"} in this category.
                {" "}Signed in as {user.name}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:items-start">
              {category.scope === "shared" ? (
                <div className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)] px-3 py-2 text-sm text-stone-600 dark:text-stone-300">
                  <div className="font-medium text-stone-800 dark:text-stone-100">
                    Last change by {lastEditor}
                  </div>
                  <div>{formatDate(category.updatedAt)}</div>
                </div>
              ) : null}
              <div className="flex gap-2">
                <SignOutButton />
              </div>
            </div>
          </div>
        </Surface>

        {notice ? (
          <div className="rounded-[var(--radius-panel)] border border-emerald-500/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[var(--radius-panel)] border border-rose-500/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <Surface className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-[1fr_220px] lg:max-w-3xl">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200">
                  <Search size={15} />
                  Search
                </span>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search items"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">
                  Sort
                </span>
                <CustomSelect
                  value={sort}
                  options={sortOptions}
                  onChange={(value) => setSort(value as SortKey)}
                />
              </label>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => setItemDraft(buildCreateItemDraft(category))}
              disabled={pending}
            >
              <Plus size={16} />
              New item
            </Button>
          </div>
        </Surface>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {visibleItems.length} visible
          </p>
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
              className={`inline-flex h-9 items-center rounded-[var(--radius-ui)] px-3 text-sm font-medium transition ${
                viewMode === "grid3"
                  ? "bg-[var(--muted-strong)] text-white"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              3
            </button>
          </div>
        </div>

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
                onEdit={() => setItemDraft(buildEditItemDraft(category, item))}
                onDelete={() => deleteItem(item)}
              />
            ))
          ) : (
            <Surface className="p-5">
              <p className="font-medium text-stone-950 dark:text-white">
                No items found.
              </p>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Add the first item or adjust your search.
              </p>
            </Surface>
          )}
        </section>
      </main>

      <ItemEditorModal
        open={Boolean(itemDraft)}
        value={itemDraft}
        pending={pending}
        onChange={setItemDraft}
        onClose={() => setItemDraft(null)}
        onSubmit={submitItemDraft}
      />
    </>
  );
}
