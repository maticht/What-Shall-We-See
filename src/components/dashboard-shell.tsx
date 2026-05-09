"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
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
import { ToastStack, type ToastMessage } from "@/components/ui/toast-stack";

type DashboardTab = "personal" | "shared";

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
    emoji: scope === "shared" ? "🍿" : "🎬",
    scope,
    connectionKey: scope === "shared" ? connections[0] ?? "" : "",
  };
}

function generateConnectionCode(length = 8) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint32Array(length);
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 2 ** 32);
    }
  }

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function CategoryCard({
  category,
  onEdit,
}: {
  category: CategoryData;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted)] text-2xl">
          {category.emoji}
        </div>
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
            {category.itemsCount} {category.itemsCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {category.connectionKey ? (
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
          {category.connectionKey}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/categories/${category.id}`}
          className="inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted-strong)] px-5 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-[#2b2b2b]"
        >
          <ExternalLink size={15} />
          Open
        </Link>
        <Button type="button" variant="secondary" onClick={onEdit}>
          <Pencil size={15} />
          Edit
        </Button>
      </div>
    </article>
  );
}

function CategoryGrid({
  categories,
  emptyText,
  onEdit,
}: {
  categories: CategoryData[];
  emptyText: string;
  onEdit: (category: CategoryData) => void;
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
          onEdit={() => onEdit(category)}
        />
      ))}
    </div>
  );
}

export function DashboardShell({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [connectionInput, setConnectionInput] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounter = useRef(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>("personal");
  const [categoryDraft, setCategoryDraft] = useState<CategoryEditorValue | null>(null);

  const pushToast = (tone: ToastMessage["tone"], text: string) => {
    toastCounter.current += 1;
    const id = `toast-${toastCounter.current}`;
    setToasts((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  };

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
    startTransition(async () => {
      try {
        await work();
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

  const editCategory = (category: CategoryData) => {
    setCategoryDraft({
      mode: "edit",
      categoryId: category.id,
      name: category.name,
      emoji: category.emoji,
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
              emoji: draft.emoji,
              scope: draft.scope,
              connectionKey: draft.connectionKey,
            }),
          });
        } else if (draft.categoryId) {
          await requestJson(`/api/categories/${draft.categoryId}`, {
            method: "PATCH",
            body: JSON.stringify({ name: draft.name, emoji: draft.emoji }),
          });
        }

        setCategoryDraft(null);
      },
      draft.mode === "create" ? "Category created." : "Category updated.",
    );
  };

  const deleteCategory = (draft: CategoryEditorValue) => {
    if (!draft.categoryId) {
      return;
    }

    runMutation(
      async () => {
        await requestJson(`/api/categories/${draft.categoryId}`, {
          method: "DELETE",
        });
        setCategoryDraft(null);
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

  const handleGenerateConnectionCode = () => {
    setConnectionInput(generateConnectionCode(8));
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SignOutButton />
            </div>
          </div>

          <div className="mt-4 inline-flex rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`rounded-[var(--radius-ui)] px-4 py-2 text-sm font-medium transition ${
                activeTab === "personal"
                  ? "bg-[var(--muted-strong)] text-white"
                  : "text-stone-500 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shared")}
              className={`rounded-[var(--radius-ui)] px-4 py-2 text-sm font-medium transition ${
                activeTab === "shared"
                  ? "bg-[var(--muted-strong)] text-white"
                  : "text-stone-500 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
              }`}
            >
              Shared
            </button>
          </div>
        </Surface>

        {activeTab === "personal" ? (
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
              emptyText="No personal categories yet."
              onEdit={editCategory}
            />
          </Surface>
        ) : (
          <>
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
                        emptyText="No shared categories for this connection."
                        onEdit={editCategory}
                      />
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line)] bg-[var(--muted)] p-4 text-sm text-stone-600 dark:text-stone-300">
                  No shared categories yet. Add an access code and create one.
                </div>
              )}
            </Surface>

            <Surface className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeading
                  eyebrow="Connections"
                  icon={<Link2 size={14} />}
                  title="Shared access codes"
                  description="Use the same access code with your partner to share categories."
                />
                <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                  <Input
                    value={connectionInput}
                    onChange={(event) => setConnectionInput(event.target.value)}
                    placeholder="MOVIENIGHT"
                  />
                  <Button type="button" variant="secondary" onClick={handleGenerateConnectionCode}>
                    Generate
                  </Button>
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
                    No access codes yet.
                  </p>
                )}
              </div>
            </Surface>
          </>
        )}
      </main>

      <CategoryEditorModal
        open={Boolean(categoryDraft)}
        value={categoryDraft}
        connections={data.user.connections}
        pending={pending}
        onChange={setCategoryDraft}
        onClose={() => setCategoryDraft(null)}
        onSubmit={submitCategoryDraft}
        onDelete={deleteCategory}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}
