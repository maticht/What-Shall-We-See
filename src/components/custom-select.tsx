"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function CustomSelect({
  value,
  options,
  placeholder = "Select an option",
  disabled = false,
  onChange,
}: CustomSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-left text-sm text-white outline-none transition hover:border-white/20",
          open && "border-white/30 shadow-sm",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {selected?.label ?? placeholder}
          </span>
          <span className="sr-only">{selected?.description ?? ""}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-stone-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_56px_rgba(20,20,20,0.14)] backdrop-blur-xl">
          <div className="grid gap-1">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-[var(--radius-ui)] px-3 py-2.5 text-left transition",
                    isSelected
                      ? "bg-[var(--muted-strong)] text-white"
                      : "bg-transparent text-stone-100 hover:bg-white/[0.06]",
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span
                        className={cn(
                          "mt-1 block text-xs",
                          isSelected
                            ? "text-stone-300"
                            : "text-stone-400",
                        )}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <Check
                    size={16}
                    className={cn(
                      "mt-0.5 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
