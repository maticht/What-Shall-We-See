"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Users2,
} from "lucide-react";
import type { CategoryData, DashboardData } from "@/types/app";
import {
  CategoryEditorModal,
  type CategoryEditorValue,
} from "@/components/category-editor-modal";
import { SignOutButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function CategoryCard({
  category,
  pending,
  onEdit,
  onDelete,
}: {
  category: CategoryData;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isShared = category.scope === "shared";
  const lastEditor = category.lastEditedByName ?? "Unknown";

  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-stone-950 dark:text-white">
              {category.name}
            </h3>
            <span className="rounded-[var(--radius-ui)] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600 dark:text-stone-300">
              {category.scope}
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            {category.items.length} {category.items.length === 1 ? "item" : "items"}
          </p>
        </div>

        {isShared ? (
          <div className="shrink-0 rounded-[var(--radius-ui)] border border-[var(--line-soft)] bg-[var(--muted)] px-2 py-1 text-right text-[11px] text-stone-600 dark:text-stone-300">
            <div>Updated by {lastEditor}</div>
            <div>{formatDate(category.updatedAt)}</div>
          </div>
        ) : null}
      </div>

      {category.connectionKey ? (
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
          {category.connectionKey}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/categories/${category.id}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted-strong)] px-3.5 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-[#2b2b2b]"
        >
          <ExternalLink size={15} />
          Open
        </Link>
        <Button type="button" variant="secondary" onClick={onEdit}>
          <Pencil size={15} />
          Edit
        </Button>
        <Button type="button" variant="danger" disabled={pending} onClick={onDelete}>
          <Trash2 size={15} />
          Delete
        </Button>
      </div>
    </article>
  );
}

function CategoryGrid({
  categories,
  pending,
  emptyText,
  onEdit,
  onDelete,
}: {
  categories: CategoryData[];
  pending: boolean;
  emptyText: string;
  onEdit: (category: CategoryData) => void;
  onDelete: (category: CategoryData) => void;
}) {
  if (!categories.length) {
    return (
      <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line)] bg-[var(--muted)] p-4 text-sm text-stone-600 dark:text-stone-300">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          pending={pending}
          onEdit={() => onEdit(category)}
          onDelete={() => onDelete(category)}
        />
      ))}
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

  const totalItems = useMemo(() => {
    return [...data.personalCategories, ...data.sharedCategories].reduce(
      (count, category) => count + category.items.length,
      0,
    );
  }, [data.personalCategories, data.sharedCategories]);

  const sharedByConnection = useMemo(() => {
    return data.sharedCategories.reduce<Record<string, CategoryData[]>>(
      (groups, category) => {
        const key = category.connectionKey ?? "UNKNOWN";
        groups[key] ??= [];
        groups[key].push(category);
        return groups;
      },
      {},
    );
  }, [data.sharedCategories]);

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

  const editCategory = (category: CategoryData) => {
    setCategoryDraft({
      mode: "edit",
      categoryId: category.id,
      name: category.name,
      scope: category.scope,
      connectionKey: category.connectionKey ?? "",
    });
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
            body: JSON.stringify({ name: draft.name }),
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

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Surface className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                Dashboard
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
                Category control
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
                Create and edit categories here. Open a category to manage its
                items, search, sort, and update statuses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SignOutButton />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                Categories
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
                {data.personalCategories.length + data.sharedCategories.length}
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                Items
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
                {totalItems}
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                Connections
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white">
                {data.user.connections.length}
              </p>
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Connections"
              icon={<Link2 size={14} />}
              title="Shared access codes"
              description="Use the same connection code with another person to unlock shared categories."
            />
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
              <Input
                value={connectionInput}
                onChange={(event) => setConnectionInput(event.target.value)}
                placeholder="MOVIENIGHT"
              />
              <Button type="button" variant="primary" onClick={handleConnectionAdd} disabled={pending}>
                <Plus size={16} />
                Add
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {data.user.connections.length ? (
              data.user.connections.map((connection) => (
                <span
                  key={connection}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-stone-800 dark:text-stone-100"
                >
                  {connection}
                  <button
                    type="button"
                    onClick={() => handleConnectionRemove(connection)}
                    className="text-stone-500 transition hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-300"
                    aria-label={`Remove ${connection}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              ))
            ) : (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No connection codes yet.
              </p>
            )}
          </div>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              eyebrow="Personal"
              icon={<BookOpen size={14} />}
              title="Your categories"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setCategoryDraft(buildEmptyCategoryDraft("personal", data.user.connections))
              }
            >
              <Plus size={16} />
              New category
            </Button>
          </div>
          <CategoryGrid
            categories={data.personalCategories}
            pending={pending}
            emptyText="No personal categories yet."
            onEdit={editCategory}
            onDelete={deleteCategory}
          />
        </Surface>

        <Surface className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              eyebrow="Shared"
              icon={<Users2 size={14} />}
              title="Connected categories"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!data.user.connections.length}
              onClick={() =>
                setCategoryDraft(buildEmptyCategoryDraft("shared", data.user.connections))
              }
            >
              <Plus size={16} />
              New shared category
            </Button>
          </div>

          {Object.entries(sharedByConnection).length ? (
            <div className="grid gap-4">
              {Object.entries(sharedByConnection).map(([connection, categories]) => (
                <section key={connection} className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                      {connection}
                    </p>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {categories.length} {categories.length === 1 ? "category" : "categories"}
                    </span>
                  </div>
                  <CategoryGrid
                    categories={categories}
                    pending={pending}
                    emptyText="No shared categories for this connection."
                    onEdit={editCategory}
                    onDelete={deleteCategory}
                  />
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line)] bg-[var(--muted)] p-4 text-sm text-stone-600 dark:text-stone-300">
              No shared categories yet. Add a connection code, then create a
              shared category.
            </div>
          )}
        </Surface>
      </main>

      <CategoryEditorModal
        open={Boolean(categoryDraft)}
        value={categoryDraft}
        connections={data.user.connections}
        pending={pending}
        onChange={setCategoryDraft}
        onClose={() => setCategoryDraft(null)}
        onSubmit={submitCategoryDraft}
      />
    </>
  );
}
