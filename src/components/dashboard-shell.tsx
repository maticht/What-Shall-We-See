"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Link2,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Users2,
} from "lucide-react";
import type { CategoryData, DashboardData, MediaItemData } from "@/types/app";
import {
  CategoryEditorModal,
  type CategoryEditorValue,
} from "@/components/category-editor-modal";
import { ItemEditorModal, type ItemEditorValue } from "@/components/item-editor-modal";
import { SignOutButton } from "@/components/auth-buttons";
import { StatusBadge } from "@/components/status-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, formatRating } from "@/lib/utils";

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

function buildEmptyCategoryDraft(
  scope: "personal" | "shared",
  connections: string[],
): CategoryEditorValue {
  return {
    mode: "create",
    name: "",
    scope,
    connectionKey: scope === "shared" ? connections[0] ?? "" : "",
  };
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

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/10 bg-stone-50/80 p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-lg font-semibold text-stone-900 dark:text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DashboardShell({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [connectionInput, setConnectionInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryEditorValue | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemEditorValue | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(null), 3200);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const sharedGroups = useMemo(() => {
    return data.sharedCategories.reduce<Record<string, CategoryData[]>>((groups, category) => {
      const key = category.connectionKey ?? "UNKNOWN";
      groups[key] ??= [];
      groups[key].push(category);
      return groups;
    }, {});
  }, [data.sharedCategories]);

  const totalItems = useMemo(() => {
    return [...data.personalCategories, ...data.sharedCategories].reduce(
      (count, category) => count + category.items.length,
      0,
    );
  }, [data.personalCategories, data.sharedCategories]);

  const ratedItems = useMemo(() => {
    return [...data.personalCategories, ...data.sharedCategories].flatMap((category) =>
      category.items.filter((item) => item.rating !== null),
    );
  }, [data.personalCategories, data.sharedCategories]);

  const averageRating =
    ratedItems.length > 0
      ? ratedItems.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
        ratedItems.length
      : null;

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

  const handleConnectionAdd = () => {
    runMutation(
      async () => {
        await requestJson("/api/profile", {
          method: "PUT",
          body: JSON.stringify({
            action: "add_connection",
            connectionKey: connectionInput,
          }),
        });
        setConnectionInput("");
      },
      "Connection added.",
    );
  };

  const handleConnectionRemove = (connectionKey: string) => {
    runMutation(
      async () => {
        await requestJson("/api/profile", {
          method: "PUT",
          body: JSON.stringify({
            action: "remove_connection",
            connectionKey,
          }),
        });
      },
      "Connection removed.",
    );
  };

  const submitCategoryDraft = (draft: CategoryEditorValue) => {
    runMutation(
      async () => {
        if (draft.mode === "create") {
          await requestJson("/api/categories", {
            method: "POST",
            body: JSON.stringify({
              name: draft.name,
              scope: draft.scope,
              connectionKey: draft.connectionKey,
            }),
          });
        } else if (draft.categoryId) {
          await requestJson(`/api/categories/${draft.categoryId}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: draft.name,
            }),
          });
        }

        setCategoryDraft(null);
      },
      draft.mode === "create" ? "Category created." : "Category updated.",
    );
  };

  const deleteCategory = (category: CategoryData) => {
    runMutation(
      async () => {
        await requestJson(`/api/categories/${category.id}`, {
          method: "DELETE",
        });
      },
      "Category removed.",
    );
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
      draft.mode === "create" ? "Card created." : "Card updated.",
    );
  };

  const deleteItem = (category: CategoryData, item: MediaItemData) => {
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
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-[32px] border border-black/10 bg-[var(--panel)] px-5 py-5 shadow-[0_24px_80px_rgba(15,15,15,0.08)] dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-stone-500 dark:text-stone-400">
                Shared watchlist studio
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 dark:text-white sm:text-4xl">
                What Shall We See
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
                Keep your personal shelves tidy, connect with another person
                through a shared code, and build collaborative categories for
                films, series, books, manga, and manhwa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Profile" value={data.user.name} helper={data.user.email} />
            <StatCard
              label="Total cards"
              value={String(totalItems)}
              helper="Across personal and shared spaces."
            />
            <StatCard
              label="Connections"
              value={String(data.user.connections.length)}
              helper="Shared codes unlock collaborative shelves."
            />
            <StatCard
              label="Average rating"
              value={averageRating === null ? "-" : averageRating.toFixed(1)}
              helper="Based on every rated card you can access."
            />
          </div>
        </header>

        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-200">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-black/10 bg-[var(--panel)] p-5 dark:border-white/10 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-lg">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                  <Link2 size={14} />
                  Connections
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-white">
                  Match with someone else
                </h2>
                <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-stone-300">
                  Share the same connection code with another person. If both of
                  you keep that code in your profile, you unlock the same shared
                  categories.
                </p>
              </div>

              <div className="rounded-[26px] border border-dashed border-black/10 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
                Example codes: MOVIENIGHT, CLUB_2026, READ-LIST
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={connectionInput}
                onChange={(event) => setConnectionInput(event.target.value)}
                placeholder="Add a shared connection code"
                className="min-h-12 flex-1 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white"
              />
              <button
                type="button"
                onClick={handleConnectionAdd}
                disabled={pending}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-70 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
              >
                <Plus size={16} />
                Add code
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {data.user.connections.length ? (
                data.user.connections.map((connection) => (
                  <div
                    key={connection}
                    className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100"
                  >
                    <span>{connection}</span>
                    <button
                      type="button"
                      onClick={() => handleConnectionRemove(connection)}
                      className="text-stone-500 transition hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-300"
                      aria-label={`Remove ${connection}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  No connection codes yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-black/10 bg-[var(--panel)] p-5 dark:border-white/10 sm:p-6">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
              <Sparkles size={14} />
              Workflow
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-white">
              A calm, Notion-like flow
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                "Create your personal categories first.",
                "Add titles, poster links, statuses, and ratings.",
                "Share a connection code to open shared shelves.",
                "Edit everything together from any device.",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[24px] border border-black/10 bg-stone-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-white dark:bg-white dark:text-stone-950">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-stone-700 dark:text-stone-200">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-black/10 bg-[var(--panel)] p-5 dark:border-white/10 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                <BookOpen size={14} />
                Personal library
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-white">
                Your categories
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setCategoryDraft(buildEmptyCategoryDraft("personal", data.user.connections))
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:-translate-y-0.5 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            >
              <Plus size={16} />
              New personal category
            </button>
          </div>

          <div className="mt-6 grid gap-5">
            {data.personalCategories.length ? (
              data.personalCategories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  pending={pending}
                  onEditCategory={() =>
                    setCategoryDraft({
                      mode: "edit",
                      categoryId: category.id,
                      name: category.name,
                      scope: category.scope,
                      connectionKey: category.connectionKey ?? "",
                    })
                  }
                  onDeleteCategory={() => deleteCategory(category)}
                  onCreateItem={() => setItemDraft(buildCreateItemDraft(category))}
                  onEditItem={(item) => setItemDraft(buildEditItemDraft(category, item))}
                  onDeleteItem={(item) => deleteItem(category, item)}
                />
              ))
            ) : (
              <EmptyState
                title="Your personal shelf is empty."
                description="Create a category for movies, books, manga, or anything else you want to track."
              />
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-black/10 bg-[var(--panel)] p-5 dark:border-white/10 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                <Users2 size={14} />
                Shared spaces
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-white">
                Connected categories
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setCategoryDraft(buildEmptyCategoryDraft("shared", data.user.connections))
              }
              disabled={data.user.connections.length === 0}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:-translate-y-0.5 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white",
                data.user.connections.length === 0 && "cursor-not-allowed opacity-50",
              )}
            >
              <Plus size={16} />
              New shared category
            </button>
          </div>

          <div className="mt-6 grid gap-6">
            {Object.keys(sharedGroups).length ? (
              Object.entries(sharedGroups).map(([connectionKey, categories]) => (
                <div
                  key={connectionKey}
                  className="rounded-[28px] border border-black/10 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                        Connection
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-stone-950 dark:text-white">
                        {connectionKey}
                      </h3>
                    </div>
                    <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-stone-600 dark:border-white/10 dark:text-stone-300">
                      {categories.length} categories
                    </span>
                  </div>

                  <div className="grid gap-5">
                    {categories.map((category) => (
                      <CategorySection
                        key={category.id}
                        category={category}
                        pending={pending}
                        onEditCategory={() =>
                          setCategoryDraft({
                            mode: "edit",
                            categoryId: category.id,
                            name: category.name,
                            scope: category.scope,
                            connectionKey: category.connectionKey ?? "",
                          })
                        }
                        onDeleteCategory={() => deleteCategory(category)}
                        onCreateItem={() => setItemDraft(buildCreateItemDraft(category))}
                        onEditItem={(item) => setItemDraft(buildEditItemDraft(category, item))}
                        onDeleteItem={(item) => deleteItem(category, item)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No shared categories yet."
                description="Add the same connection code as another person, then create shared categories together."
              />
            )}
          </div>
        </section>
      </div>

      <CategoryEditorModal
        open={Boolean(categoryDraft)}
        value={categoryDraft}
        connections={data.user.connections}
        pending={pending}
        onChange={setCategoryDraft}
        onClose={() => setCategoryDraft(null)}
        onSubmit={submitCategoryDraft}
      />

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

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[26px] border border-black/10 bg-stone-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-stone-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{helper}</p>
    </div>
  );
}

function CategorySection({
  category,
  pending,
  onEditCategory,
  onDeleteCategory,
  onCreateItem,
  onEditItem,
  onDeleteItem,
}: {
  category: CategoryData;
  pending: boolean;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onCreateItem: () => void;
  onEditItem: (item: MediaItemData) => void;
  onDeleteItem: (item: MediaItemData) => void;
}) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-stone-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-stone-950 dark:text-white">
              {category.name}
            </h3>
            <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:border-white/10 dark:text-stone-400">
              {category.scope}
            </span>
            {category.connectionKey ? (
              <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:border-white/10 dark:text-stone-400">
                {category.connectionKey}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            {category.items.length} {category.items.length === 1 ? "card" : "cards"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateItem}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3.5 py-2 text-sm font-medium text-stone-800 transition hover:-translate-y-0.5 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          >
            <Plus size={15} />
            Add card
          </button>
          <button
            type="button"
            onClick={onEditCategory}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:text-stone-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300 dark:hover:text-white"
          >
            <Pencil size={15} />
            Edit
          </button>
          <button
            type="button"
            onClick={onDeleteCategory}
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-70 dark:border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {category.items.length ? (
          category.items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-[24px] border border-black/10 bg-[var(--card)] shadow-[0_18px_45px_rgba(15,15,15,0.06)] dark:border-white/10"
            >
              <div className="relative h-44 w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                  <StatusBadge status={item.status} />
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-900 shadow-sm">
                    <Star size={12} className="fill-current" />
                    {formatRating(item.rating)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-lg font-semibold text-stone-950 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    Updated {new Date(item.updatedAt).toLocaleDateString("en-US")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800 transition hover:-translate-y-0.5 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15"
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState
              title="No cards in this category yet."
              description="Add the first title with a cover link, status, and personal rating."
              action={
                <button
                  type="button"
                  onClick={onCreateItem}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
                >
                  <Plus size={16} />
                  Add first card
                </button>
              }
            />
          </div>
        )}
      </div>
    </article>
  );
}
