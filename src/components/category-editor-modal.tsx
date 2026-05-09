"use client";

import { X } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";

export interface CategoryEditorValue {
  mode: "create" | "edit";
  categoryId?: string;
  name: string;
  scope: "personal" | "shared";
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
}

export function CategoryEditorModal({
  open,
  value,
  connections,
  pending,
  onChange,
  onClose,
  onSubmit,
}: CategoryEditorModalProps) {
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
  const connectionOptions = connections.map((connection) => ({
    value: connection,
    label: connection,
    description: "Shared workspace access key.",
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/35 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_18px_56px_rgba(20,20,20,0.18)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
              {value.mode === "create" ? "New category" : "Edit category"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950 dark:text-white">
              {value.mode === "create"
                ? "Shape a new shelf"
                : "Refine this category"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-ui)] border border-[var(--line)] text-stone-500 transition hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
            aria-label="Close category editor"
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

          <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--line)] bg-[var(--muted)] p-3 text-sm text-stone-600 dark:text-stone-300">
            Personal categories belong only to you. Shared categories are visible
            to everyone using the same connection code.
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending
                ? "Saving..."
                : value.mode === "create"
                  ? "Create category"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
