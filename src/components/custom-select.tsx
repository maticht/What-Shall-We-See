"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

interface PanelStyle {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function CustomSelect({
  value,
  options,
  placeholder = "Select an option",
  disabled = false,
  onChange,
}: CustomSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<PanelStyle | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelPosition = () => {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 6;
      const margin = 12;

      const spaceBelow = viewportHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const shouldOpenAbove =
        (spaceBelow < 180 && spaceAbove > spaceBelow) || spaceAbove > 320;
      const availableSpace = shouldOpenAbove ? spaceAbove : spaceBelow;
      const compactItemHeight = 34;
      const panelChrome = 8;
      const contentHeight = options.length * compactItemHeight + panelChrome;
      const availableHeight = Math.max(
        90,
        Math.min(contentHeight, Math.min(320, availableSpace - gap)),
      );

      let top = shouldOpenAbove
        ? rect.top - gap - availableHeight
        : rect.bottom + gap;

      if (top < margin) {
        top = margin;
      } else if (top + availableHeight > viewportHeight - margin) {
        top = viewportHeight - margin - availableHeight;
      }

      const clampedLeft = Math.min(
        rect.left,
        Math.max(margin, viewportWidth - margin - rect.width),
      );

      setPanelStyle({
        top,
        left: clampedLeft,
        width: rect.width,
        maxHeight: availableHeight,
      });
    };

    updatePanelPosition();
    const observer = new ResizeObserver(() => {
      updatePanelPosition();
    });
    const viewport = window.visualViewport;
    let frameId = 0;

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    const animate = () => {
      updatePanelPosition();
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    viewport?.addEventListener("resize", updatePanelPosition);
    viewport?.addEventListener("scroll", updatePanelPosition);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      viewport?.removeEventListener("resize", updatePanelPosition);
      viewport?.removeEventListener("scroll", updatePanelPosition);
    };
  }, [open, options.length]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
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
          size={18}
          className={cn(
            "shrink-0 text-stone-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !disabled && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[980] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[rgba(22,22,22,0.82)] shadow-[0_18px_56px_rgba(20,20,20,0.24)] backdrop-blur-md"
              style={{
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
                maxHeight: panelStyle.maxHeight,
              }}
            >
              <div className="grid gap-0.5 overflow-y-auto p-1" style={{ maxHeight: panelStyle.maxHeight }}>
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
                        "flex min-h-8 items-center justify-between gap-2 rounded-[var(--radius-ui)] px-2.5 py-1.5 text-left transition",
                        isSelected
                          ? "bg-[var(--muted-strong)] text-white"
                          : "bg-transparent text-stone-100 hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="sr-only">{option.description}</span>
                        ) : null}
                      </span>
                      <Check
                        size={18}
                        className={cn(
                          "shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
