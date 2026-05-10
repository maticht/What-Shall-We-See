"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Smile, Trash2, X } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { CATEGORY_GLOBAL_TYPE_OPTIONS } from "@/lib/constants";
import type { CategoryGlobalType } from "@/types/app";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";

export interface CategoryEditorValue {
  mode: "create" | "edit";
  categoryId?: string;
  name: string;
  emoji: string;
  scope: "personal" | "shared";
  globalType: CategoryGlobalType;
  connectionKey: string;
}

interface CategoryEditorModalProps {
  open: boolean;
  value: CategoryEditorValue | null;
  connections: string[];
  pending: boolean;
  onChange: (value: CategoryEditorValue) => void;
  onClose: () => void;
  onSubmit: (value: CategoryEditorValue) => void;
  onDelete?: (value: CategoryEditorValue) => void;
}

const emojiGroups = [
  {
    title: "Cinema",
    emojis: ["🎬", "🍿", "🎞️", "📺", "🎭", "⭐", "🌙", "🔥", "🕹️", "🎟️", "📽️", "🪄"],
  },
  {
    title: "Reading",
    emojis: ["📚", "📖", "✏️", "📰", "✨", "🔖", "🧠", "☕", "📝", "🗂️", "📊", "🖋️"],
  },
  {
    title: "Mood",
    emojis: ["💖", "⚡", "🌿", "🪐", "🎧", "🏆", "🧩", "📁", "💎", "🌈", "🌊", "🕯️"],
  },
  {
    title: "Genres",
    emojis: ["🧙", "🚀", "🕯️", "🗡️", "🕵️", "🧛", "🤖", "🏰", "🌋", "🧸", "🎨", "💫"],
  },
  {
    title: "Gaming",
    emojis: ["🎮", "🕹️", "👾", "🏆", "⚔️", "🧩", "🎯", "♟️", "🛡️", "🧠", "🪄", "🏹"],
  },
];

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

export function CategoryEditorModal({
  open,
  value,
  connections,
  pending,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: CategoryEditorModalProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  useBodyScrollLock(open);

  if (!open || !value) {
    return null;
  }

  const isShared = value.scope === "shared";
  const scopeOptions = [
    {
      value: "personal",
      label: "Personal",
      description: "Visible only in your private library.",
    },
    {
      value: "shared",
      label: "Shared",
      description: "Visible to everyone with this connection code.",
    },
  ];
  const globalTypeOptions = CATEGORY_GLOBAL_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));
  const connectionOptions = connections.map((connection) => ({
    value: connection,
    label: connection,
    description: "Shared workspace access key.",
  }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/35 px-3 pt-3 pb-8 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="flex max-h-[calc(100dvh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_56px_rgba(20,20,20,0.18)] sm:max-h-[calc(100dvh-2rem)]">
          <div className="shrink-0 border-b border-[var(--line)] p-4 pb-3 sm:p-5 sm:pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  {value.mode === "create" ? "New category" : "Edit category"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-stone-100">
                  {value.mode === "create"
                    ? "Shape a new shelf"
                    : "Refine this category"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-400 transition hover:text-white"
                aria-label="Close category editor"
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
              <div className="grid gap-3 sm:grid-cols-[76px_1fr] sm:items-end">
                <div className="space-y-2">
                  <FieldLabel>Emoji</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setEmojiPickerOpen(true)}
                    className="flex h-20 w-20 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--muted)] text-4xl shadow-inner transition hover:border-white/20 hover:bg-[var(--muted-strong)] sm:h-[76px] sm:w-[76px]"
                    aria-label="Choose category emoji"
                  >
                    {value.emoji}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen(true)}
                  className="flex h-20 w-full flex-col justify-center rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-3 text-left transition hover:border-white/20 hover:bg-[var(--muted)] sm:h-[76px]"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-100">
                    <Smile size={16} />
                    Pick a category face
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone-300">
                    This emoji appears on the dashboard and inside the category.
                  </p>
                </button>
              </div>

              <label className="block space-y-2">
                <FieldLabel>Category name</FieldLabel>
                <Input
                  value={value.name}
                  onChange={(event) =>
                    onChange({ ...value, name: event.target.value })
                  }
                  placeholder="Weekend movies"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <FieldLabel>Scope</FieldLabel>
                  <CustomSelect
                    value={value.scope}
                    disabled={value.mode === "edit"}
                    onChange={(nextScope) =>
                      onChange({
                        ...value,
                        scope: nextScope as "personal" | "shared",
                        connectionKey:
                          nextScope === "shared"
                            ? value.connectionKey || connections[0] || ""
                            : "",
                      })
                    }
                    options={scopeOptions}
                  />
                </label>

                <label className="block space-y-2">
                  <FieldLabel>Global type</FieldLabel>
                  <CustomSelect
                    value={value.globalType}
                    onChange={(globalType) =>
                      onChange({
                        ...value,
                        globalType: globalType as CategoryEditorValue["globalType"],
                      })
                    }
                    options={globalTypeOptions}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <FieldLabel>Connection</FieldLabel>
                  <CustomSelect
                    value={value.connectionKey}
                    disabled={!isShared || connections.length === 0 || value.mode === "edit"}
                    onChange={(connectionKey) =>
                      onChange({ ...value, connectionKey })
                    }
                    options={
                      connectionOptions.length
                        ? connectionOptions
                        : [
                            {
                              value: "",
                              label: "No shared connection yet",
                              description: "Add a connection code first.",
                            },
                          ]
                    }
                    placeholder="Choose connection"
                  />
                </label>
              </div>

              <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line)] bg-[var(--muted)] p-3 text-sm text-stone-300">
                Personal categories belong only to you. Shared categories are visible
                to everyone using the same connection code.
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {value.mode === "edit" && onDelete ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={pending}
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="order-3 w-full justify-center sm:order-1 sm:w-auto"
                  >
                    <Trash2 size={15} />
                    Delete category
                  </Button>
                ) : (
                  <div className="order-3 hidden sm:order-1 sm:block" />
                )}

                <div className="order-1 grid gap-2 sm:order-2 sm:flex sm:justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={pending}
                    className="w-full min-w-36 sm:w-auto"
                  >
                    {pending
                      ? "Saving..."
                      : value.mode === "create"
                        ? "Create category"
                        : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {emojiPickerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/55 p-3 backdrop-blur-md sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:max-h-[82dvh]">
            <div className="shrink-0 border-b border-[var(--line)] bg-[var(--muted)] p-3 sm:p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                    Category emoji
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-stone-100">
                    Choose the shelf marker
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-400 transition hover:text-white"
                  aria-label="Close emoji picker"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-[var(--card)] p-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-ui)] bg-[var(--muted-strong)] text-2xl">
                  {value.emoji}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-100">
                    {value.name || "New category"}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    Preview on your dashboard cards.
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {emojiGroups.map((group) => (
                <section key={group.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 sm:gap-2">
                    {group.emojis.map((emoji) => {
                      const selected = value.emoji === emoji;

                      return (
                        <button
                          key={`${group.title}-${emoji}`}
                          type="button"
                          onClick={() => {
                            onChange({ ...value, emoji });
                            setEmojiPickerOpen(false);
                          }}
                          className={`flex h-10 w-full items-center justify-center rounded-[var(--radius-ui)] border text-xl transition sm:h-11 sm:text-2xl ${
                            selected
                              ? "scale-105 border-white/30 bg-white/15 text-[1.45rem] shadow-[0_0_0_3px_rgba(255,255,255,0.05)] sm:text-[1.7rem]"
                              : "border-[var(--line)] bg-[var(--card)] hover:border-white/20 hover:bg-[var(--muted-strong)]"
                          }`}
                          aria-label={`Use ${emoji} emoji`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteOpen && onDelete ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto overscroll-contain bg-stone-950/60 p-3 backdrop-blur-md sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-rose-500/20 bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-rose-500/25 bg-rose-400/10 text-rose-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-100">
                  Delete category?
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-300">
                  This will remove &quot;{value.name}&quot; and every item inside it.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDeleteOpen(false)}
                className="order-1 w-full sm:order-1"
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
                className="order-2 w-full sm:order-2"
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

