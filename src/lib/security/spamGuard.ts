/**
 * Convenience wrappers around checkRateLimit for content/spam surfaces.
 * Usage:
 *   const guard = await guardAction("storyUploads", userId);
 *   if (!guard.ok) { toast.error(guard.message); return; }
 */

import { checkRateLimit, rateLimitMessage, logSecurityEvent } from "./rateLimiter";
import type { SecurityAction } from "./config";

export interface GuardResult {
  ok: boolean;
  message?: string;
  retryAfter?: number;
}

export async function guardAction(action: SecurityAction, identifier: string): Promise<GuardResult> {
  const result = await checkRateLimit(action, identifier);
  if (result.allowed) return { ok: true };
  void logSecurityEvent(action, "rate_limit_hit", identifier, { attempts: result.attempts });
  return {
    ok: false,
    retryAfter: result.retryAfter,
    message: rateLimitMessage(action, result.retryAfter),
  };
}
