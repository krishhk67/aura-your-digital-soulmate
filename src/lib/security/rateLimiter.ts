/**
 * Client-side wrapper around the server-side check_and_record_rate_limit RPC.
 * Falls back gracefully if the RPC is unreachable (never blocks the user
 * on infrastructure hiccups, just logs a warning).
 *
 * The RPC is defined in a Supabase migration and works with any Supabase
 * project — Lovable-managed or self-hosted.
 */

import { supabase } from "@/integrations/supabase/client";
import { SECURITY_CONFIG, type SecurityAction } from "./config";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds
  attempts: number;
  locked?: boolean;
}

/** Stable per-browser fingerprint (no PII). Used when we don't have an email yet. */
export function getClientFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "aurix.security.fp";
  let fp = localStorage.getItem(KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(KEY, fp);
  }
  return fp;
}

/**
 * Check + record an attempt. Returns `allowed: false` when the user is
 * over the limit — caller MUST honor it and show `formatCooldown(retryAfter)`.
 */
export async function checkRateLimit(
  action: SecurityAction,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = SECURITY_CONFIG[action];
  const id = (identifier || getClientFingerprint()).toLowerCase().trim();

  try {
    const rpc = supabase.rpc as unknown as (
      fn: "check_and_record_rate_limit",
      args: { _identifier: string; _action: string; _max_attempts: number; _window_seconds: number },
    ) => Promise<{ data: { allowed: boolean; retry_after: number; attempts: number; locked?: boolean } | null; error: { message: string } | null }>;

    const { data, error } = await rpc("check_and_record_rate_limit", {
      _identifier: id,
      _action: action,
      _max_attempts: rule.maxAttempts,
      _window_seconds: rule.windowSeconds,
    });
    if (error || !data) {
      console.warn("[security] rate-limit RPC failed, allowing:", error?.message);
      return { allowed: true, retryAfter: 0, attempts: 0 };
    }
    return {
      allowed: data.allowed,
      retryAfter: data.retry_after ?? 0,
      attempts: data.attempts ?? 0,
      locked: data.locked,
    };
  } catch (e) {
    console.warn("[security] rate-limit exception, allowing:", e);
    return { allowed: true, retryAfter: 0, attempts: 0 };
  }
}

/** Clear an entry after a fully successful action (e.g. successful login). */
export async function resetRateLimit(action: SecurityAction, identifier: string): Promise<void> {
  const id = (identifier || getClientFingerprint()).toLowerCase().trim();
  try {
    const rpc = supabase.rpc as unknown as (
      fn: "reset_rate_limit", args: { _identifier: string; _action: string }
    ) => Promise<{ error: { message: string } | null }>;
    await rpc("reset_rate_limit", { _identifier: id, _action: action });
  } catch { /* non-fatal */ }
}

/** Fire-and-forget security event log. */
export async function logSecurityEvent(
  action: SecurityAction | string,
  eventType: "failed_login" | "suspicious_signup" | "account_locked" | "rate_limit_hit" | string,
  identifier: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const id = (identifier || getClientFingerprint()).toLowerCase().trim();
  try {
    const rpc = supabase.rpc as unknown as (
      fn: "log_security_event",
      args: { _identifier: string; _action: string; _event_type: string; _metadata: Record<string, unknown> },
    ) => Promise<{ error: { message: string } | null }>;
    await rpc("log_security_event", {
      _identifier: id, _action: action, _event_type: eventType, _metadata: metadata,
    });
  } catch { /* non-fatal */ }
}

/** Human-friendly "try again in …" string. */
export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return "shortly";
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hrs = Math.ceil(mins / 60);
  return `${hrs} hour${hrs === 1 ? "" : "s"}`;
}

/** Standard "too many attempts" message. */
export function rateLimitMessage(action: SecurityAction, retryAfter: number): string {
  const rule = SECURITY_CONFIG[action];
  return `Too many ${rule.label} attempts. Please try again in ${formatCooldown(retryAfter)}.`;
}
