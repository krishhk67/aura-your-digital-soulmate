/**
 * Central security configuration.
 * All rate limits, cooldowns, and spam thresholds live here.
 * Change values in ONE place — never hardcode elsewhere.
 *
 * Migration-safe: pure config, no Lovable-only APIs.
 */

export interface RateLimitRule {
  /** Max attempts allowed within `windowSeconds` before escalation kicks in. */
  maxAttempts: number;
  /** Rolling window length in seconds. */
  windowSeconds: number;
  /** User-facing action label (for toast copy). */
  label: string;
}

export const SECURITY_CONFIG = {
  // ── Authentication ────────────────────────────────────────────
  signupAttempts:     { maxAttempts: 5, windowSeconds: 15 * 60, label: "sign up" },
  loginAttempts:      { maxAttempts: 5, windowSeconds: 10 * 60, label: "sign in" },
  passwordResets:     { maxAttempts: 3, windowSeconds: 30 * 60, label: "password reset" },
  verificationEmails: { maxAttempts: 3, windowSeconds: 60 * 60, label: "verification email" },

  // ── Content / spam protection ─────────────────────────────────
  storyUploads:   { maxAttempts: 20, windowSeconds: 60 * 60, label: "story upload" },
  mediaUploads:   { maxAttempts: 60, windowSeconds: 60 * 60, label: "media upload" },
  roomCreation:   { maxAttempts: 5,  windowSeconds: 60 * 60, label: "room creation" },
  groupCreation:  { maxAttempts: 10, windowSeconds: 60 * 60, label: "group creation" },
  aiRequests:     { maxAttempts: 40, windowSeconds: 60 * 60, label: "AI request" },

  // ── Progressive cooldowns (mirrors DB _cooldown_for_level) ────
  // Kept here for client-side display; source of truth is SQL.
  cooldownDurations: [0, 30, 120, 600, 3600] as const,
} as const satisfies Record<string, RateLimitRule | readonly number[]>;

export type SecurityAction = keyof Omit<typeof SECURITY_CONFIG, "cooldownDurations">;

// ── Cloudflare Turnstile (dormant until keys are set) ───────────
// After migration, set VITE_TURNSTILE_SITE_KEY in .env and the secret
// in your Supabase edge function / server middleware. No code changes needed.
export const TURNSTILE = {
  siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,
  enabled: Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY),
  // Which flows will require Turnstile once enabled:
  requiredFor: {
    signup: true,
    login: false,        // enable if brute-force pressure appears
    passwordReset: true,
  },
} as const;

// ── Email verification (dormant flag) ───────────────────────────
// Flip to true once you disable auto-confirm in your own Supabase project.
export const EMAIL_VERIFICATION = {
  required: (import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === "true"),
} as const;
