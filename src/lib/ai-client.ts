// Client-side AI request wrapper:
// - In-memory response cache (TTL)
// - In-flight request de-duplication (no duplicate calls for same payload)
// - Per-operation throttle (min interval)
// - Graceful, user-facing error normalization
// - Diagnostic logging to identify the upstream source of rate limits

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MIN_INTERVAL_MS = 1_200;

const cache = new Map<string, { ts: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const lastCallAt = new Map<string, number>();

type AiSource =
  | "Lovable AI Gateway"
  | "OpenAI"
  | "Anthropic"
  | "Gemini"
  | "Supabase Edge Functions"
  | "Unknown";

function detectSource(raw: string): AiSource {
  const s = raw.toLowerCase();
  if (s.includes("openai")) return "OpenAI";
  if (s.includes("anthropic") || s.includes("claude")) return "Anthropic";
  if (s.includes("gemini") || s.includes("google")) return "Gemini";
  if (s.includes("supabase") || s.includes("edge function") || s.includes("functions/v1"))
    return "Supabase Edge Functions";
  if (s.includes("lovable") || s.includes("ai.gateway")) return "Lovable AI Gateway";
  return "Unknown";
}

export class AiError extends Error {
  readonly userMessage: string;
  readonly source: AiSource;
  readonly kind: "rate_limit" | "credits" | "config" | "network" | "unknown";
  constructor(userMessage: string, source: AiSource, kind: AiError["kind"], raw: string) {
    super(raw);
    this.userMessage = userMessage;
    this.source = source;
    this.kind = kind;
  }
}

function normalize(e: unknown, op: string): AiError {
  const raw = e instanceof Error ? e.message : String(e);
  const source = detectSource(raw);
  const isRate = /\b429\b|rate.?limit|too many requests/i.test(raw);
  const isCredits = /\b402\b|credits? (exhausted|required)|payment required/i.test(raw);
  const isConfig = /not configured|missing.*key|unauthorized|\b401\b/i.test(raw);
  const isNetwork = /failed to fetch|network|timeout|aborted/i.test(raw);

  const kind: AiError["kind"] = isRate
    ? "rate_limit"
    : isCredits
      ? "credits"
      : isConfig
        ? "config"
        : isNetwork
          ? "network"
          : "unknown";

  const userMessage =
    kind === "rate_limit"
      ? "AI temporarily unavailable. Please try again shortly."
      : kind === "credits"
        ? "AI credits exhausted. Please add credits to continue."
        : kind === "config"
          ? "AI is not configured yet."
          : kind === "network"
            ? "Network issue reaching AI. Please try again."
            : "AI temporarily unavailable. Please try again shortly.";

  // Diagnostic log — helps identify whether the limit is from Lovable AI,
  // OpenAI, Anthropic, Gemini, or Supabase Edge Functions.
  // eslint-disable-next-line no-console
  console.warn(
    `[AI:${op}] source=${source} kind=${kind} message="${raw.slice(0, 240)}"`,
  );

  return new AiError(userMessage, source, kind, raw);
}

interface Options {
  ttlMs?: number;
  minIntervalMs?: number;
  /** Skip cache lookup but still write to it. */
  force?: boolean;
}

/**
 * Wrap a server-fn invocation with cache + dedupe + throttle.
 * `fn` is the bound serverFn (from useServerFn) — called as fn({ data: payload }).
 */
export async function aiCall<T>(
  op: string,
  payload: unknown,
  fn: (arg: { data: unknown }) => Promise<T>,
  opts: Options = {},
): Promise<T> {
  const key = `${op}:${stableKey(payload)}`;
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;

  if (!opts.force) {
    const c = cache.get(key);
    if (c && Date.now() - c.ts < ttl) return c.value as T;
  }
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const minInterval = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const last = lastCallAt.get(op) ?? 0;
  const wait = Math.max(0, minInterval - (Date.now() - last));

  const promise = (async () => {
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt.set(op, Date.now());
    const t0 = performance.now();
    try {
      const res = await fn({ data: payload });
      cache.set(key, { ts: Date.now(), value: res });
      // eslint-disable-next-line no-console
      console.info(`[AI:${op}] ok in ${(performance.now() - t0).toFixed(0)}ms`);
      return res;
    } catch (e) {
      throw normalize(e, op);
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise as Promise<unknown>);
  return promise;
}

function stableKey(v: unknown): string {
  try {
    return JSON.stringify(v, Object.keys(v as object ?? {}).sort());
  } catch {
    return String(v);
  }
}
