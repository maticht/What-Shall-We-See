"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--line)] bg-[var(--muted-strong)] text-white hover:border-white/20 hover:bg-[#2b2b2b]",
  secondary:
    "border border-[var(--line)] bg-[var(--card)] text-stone-200 hover:border-white/20 hover:bg-[var(--muted)]",
  ghost:
    "border border-transparent bg-transparent text-stone-300 hover:bg-white/[0.05]",
  danger:
    "border border-rose-500/25 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "h-11 px-3.5 py-2 text-sm",
};

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-ui)] font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
