/**
 * Cloudflare Turnstile widget — DORMANT until VITE_TURNSTILE_SITE_KEY is set.
 *
 * When disabled: renders nothing, and `useTurnstile()` returns { token: "bypass", ready: true }
 *                so forms work unchanged.
 * When enabled:  loads the Turnstile script, renders the invisible/managed
 *                widget, and exposes a token to submit alongside the request.
 *
 * Migration steps (do not touch code):
 *   1. In your Supabase project, create an edge function that verifies the
 *      token against https://challenges.cloudflare.com/turnstile/v0/siteverify
 *      using your TURNSTILE_SECRET_KEY.
 *   2. Add VITE_TURNSTILE_SITE_KEY to .env.
 *   3. That's it. This component activates automatically.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { TURNSTILE } from "@/lib/security/config";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: {
        sitekey: string;
        callback: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
        size?: "normal" | "compact" | "invisible";
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoading: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export interface TurnstileHandle {
  token: string | null;
  ready: boolean;
  reset: () => void;
}

/**
 * Hook form — pair with <TurnstileWidget /> to render the challenge.
 * When Turnstile is disabled, immediately returns a "bypass" token.
 */
export function useTurnstile(): TurnstileHandle & { widgetRef: React.RefObject<HTMLDivElement | null> } {
  const [token, setToken] = useState<string | null>(TURNSTILE.enabled ? null : "bypass");
  const [ready, setReady] = useState(!TURNSTILE.enabled);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE.enabled || !TURNSTILE.siteKey) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !widgetRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE.siteKey!,
          theme: "dark",
          size: "normal",
          callback: (t) => { setToken(t); setReady(true); },
          "error-callback": () => setToken(null),
          "expired-callback": () => setToken(null),
        });
      })
      .catch((e) => console.warn("[turnstile]", e));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
      }
    };
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  return { token, ready, reset, widgetRef };
}

/** Render slot. Returns null when Turnstile is disabled. */
export function TurnstileWidget({ innerRef }: { innerRef: React.RefObject<HTMLDivElement | null> }) {
  if (!TURNSTILE.enabled) return null;
  return <div ref={innerRef} className="my-3 flex justify-center" />;
}
