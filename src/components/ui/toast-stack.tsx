"use client";

export interface ToastMessage {
  id: string;
  tone: "success" | "error";
  text: string;
}

export function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-white/10 bg-[#161616] px-3 py-2.5 text-sm text-stone-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
        >
          <span
            className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
              toast.tone === "success" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
          <span className="leading-5">{toast.text}</span>
        </div>
      ))}
    </div>
  );
}
