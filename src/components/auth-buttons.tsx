"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

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
        {
          once: true,
        },
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
  const [buttonTheme, setButtonTheme] = useState<"outline" | "filled_black">(
    "outline",
  );

  useEffect(() => {
    const root = document.documentElement;

    const syncTheme = () => {
      setButtonTheme(root.classList.contains("dark") ? "filled_black" : "outline");
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = wrapperRef.current;

    if (!node) {
      return;
    }

    const syncWidth = () => {
      const width = Math.floor(node.getBoundingClientRect().width);

      if (width > 0) {
        setButtonWidth(Math.max(240, Math.min(420, width)));
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
                error instanceof Error
                  ? error.message
                  : "Google sign-in failed.",
              );
            }
          },
        });

        buttonRef.current.innerHTML = "";
        google.accounts.id.renderButton(buttonRef.current, {
          theme: buttonTheme,
          size: "large",
          shape: "pill",
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
  }, [buttonTheme, buttonWidth, router]);

  return (
    <div ref={wrapperRef} className={cn("w-full max-w-[420px]", className)}>
      <div ref={buttonRef} className="min-h-12" />

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
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          router.push("/");
          router.refresh();
        })
      }
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 transition hover:-translate-y-0.5 hover:border-black/15 hover:text-stone-950 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:border-white/20 dark:hover:text-white"
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <LogOut size={16} />
      )}
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
