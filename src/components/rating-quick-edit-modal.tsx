"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getRatingColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RatingQuickEditModalProps {
  open: boolean;
  itemTitle: string;
  initialRating: string;
  anchorRect?: {
    top: number;
    left: number;
    bottom: number;
    width: number;
  } | null;
  pending: boolean;
  onClose: () => void;
  onSave: (rating: string) => void;
}

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

export function RatingQuickEditModal({
  open,
  itemTitle,
  initialRating,
  anchorRect,
  pending,
  onClose,
  onSave,
}: RatingQuickEditModalProps) {
  useBodyScrollLock(open);
  const [rating, setRating] = useState(initialRating);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, pending]);

  if (!open) {
    return null;
  }

  const parsed = Number(rating);
  const hasRating = rating.trim() !== "" && Number.isFinite(parsed);
  const sliderValue = hasRating ? Math.min(10, Math.max(0, parsed)) : 5;
  const formatted = hasRating ? sliderValue.toFixed(1) : "-";
  const ratingColor = getRatingColor(hasRating ? sliderValue : null);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
  const popupWidth = Math.min(248, Math.max(208, viewportWidth - 24));
  const estimatedPopupHeight = 176;
  const topBelow = (anchorRect?.bottom ?? viewportHeight / 2) + 10;
  const topAbove =
    (anchorRect?.top ?? viewportHeight / 2) - estimatedPopupHeight - 10;
  const useAbove = topBelow + estimatedPopupHeight > viewportHeight - 8 && topAbove >= 8;
  const popupTop = useAbove ? topAbove : Math.max(8, topBelow);
  const preferredLeft = anchorRect
    ? anchorRect.left + anchorRect.width + 4
    : viewportWidth / 2 - popupWidth / 2;
  const popupLeft = Math.min(
    viewportWidth - popupWidth - 12,
    Math.max(12, preferredLeft),
  );

  return (
    <div
      className="fixed inset-0 z-[85] bg-transparent"
      onClick={() => {
        if (!pending) {
          onClose();
        }
      }}
    >
      <div
        className="absolute rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-4"
        style={{
          width: popupWidth,
          maxWidth: "calc(100vw - 24px)",
          left: popupLeft,
          top: popupTop,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Quick rating
        </p>
        <h3 className="mt-2 truncate text-base font-semibold text-stone-100">{itemTitle}</h3>

        <div className="mt-3 flex h-11 items-center gap-3 rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--card)] px-3">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={sliderValue}
            onChange={(event) => setRating(Number(event.target.value).toFixed(1))}
            className="rating-slider"
            style={{ "--rating-accent": ratingColor } as CSSProperties}
          />
          <span className="w-11 text-right text-sm font-semibold" style={{ color: ratingColor }}>
            {formatted}
          </span>
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center"
            disabled={pending}
            onClick={() => onSave(rating)}
          >
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
