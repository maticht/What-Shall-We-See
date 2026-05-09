"use client";

import { LoaderCircle, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const GOOGLE_SCRIPT_ID = "google-identity-services";

function loadGoogleScript() {
  return new Promise<NonNullable<Window["google"]>>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existing) {
      existing.addEventListener("load", () => resolve(window.google!), {
        once: true,
      });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google script.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google!);
    script.onerror = () => reject(new Error("Failed to load Google script."));
    document.head.appendChild(script);
  });
}

export function SignInButton({ className }: { className?: string }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [localError, setLocalError] = useState("");
  const [rendered, setRendered] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(300);

  useEffect(() => {
    const node = wrapperRef.current;

    if (!node) {
      return;
    }

    const syncWidth = () => {
      const width = Math.floor(node.getBoundingClientRect().width);

      if (width > 0) {
        setButtonWidth(Math.max(240, Math.min(400, width)));
      }
    };

    syncWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncWidth);
      return () => window.removeEventListener("resize", syncWidth);
    }

    const observer = new ResizeObserver(syncWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setRendered(false);
        const configResponse = await fetch("/api/auth/google", {
          method: "GET",
          cache: "no-store",
        });

        const config = (await configResponse.json()) as { clientId?: string };
        const clientId = config.clientId ?? "";

        if (!clientId) {
          throw new Error("Google client ID is missing.");
        }

        const google = await loadGoogleScript();

        if (cancelled || !buttonRef.current || !google.accounts?.id) {
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          locale: "en",
          callback: async (response) => {
            if (!response?.credential) {
              return;
            }

            try {
              setLocalError("");

              const signInResponse = await fetch("/api/auth/google", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  credential: response.credential,
                }),
              });

              const payload = (await signInResponse.json()) as {
                ok?: boolean;
                error?: string;
                details?: string;
              };

              if (!signInResponse.ok || !payload.ok) {
                throw new Error(
                  payload.details ?? payload.error ?? "Google sign-in failed.",
                );
              }

              router.push("/dashboard");
              router.refresh();
            } catch (error) {
              setLocalError(
                error instanceof Error ? error.message : "Google sign-in failed.",
              );
            }
          },
        });

        buttonRef.current.innerHTML = "";
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          locale: "en",
          width: buttonWidth,
        });

        setRendered(true);
      } catch (error) {
        setLocalError(
          error instanceof Error
            ? error.message
            : "Google sign-in setup failed.",
        );
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [buttonWidth, router]);

  return (
    <div ref={wrapperRef} className={cn("w-full max-w-[360px]", className)}>
      <div className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--card)] px-3 py-3 shadow-sm">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Sign in
          </p>
          <p className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">
            Open your personal and shared library.
          </p>
        </div>

        <div className="relative h-11 overflow-hidden rounded-[var(--radius-ui)] border border-[var(--line)] bg-[var(--muted-strong)]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold text-white">
            <LogIn size={16} />
            Continue with Google
          </div>
          <div
            ref={buttonRef}
            className="google-signin-shell absolute inset-0 z-10 flex items-center justify-center overflow-hidden opacity-[0.01]"
          />
        </div>
      </div>

      {!rendered && !localError ? (
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          <LoaderCircle className="animate-spin" size={16} />
          Loading Google sign-in...
        </div>
      ) : null}

      {localError ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
          {localError}
        </p>
      ) : null}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          router.push("/");
          router.refresh();
        })
      }
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <LogOut size={16} />
      )}
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
