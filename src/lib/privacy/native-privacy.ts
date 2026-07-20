/**
 * Native screenshot / screen-recording protection bridge.
 *
 * Scoped to sensitive surfaces (Anonymous Space, future Black Vault).
 * - On plain web: no-op. Browsers cannot block screenshots.
 * - Inside a Capacitor wrapper with a Privacy Screen plugin (e.g.
 *   `@capacitor-community/privacy-screen` or `capacitor-plugin-privacy-screen`),
 *   this calls `enable()` / `disable()`. On Android that sets FLAG_SECURE
 *   (blocks screenshots + screen recording, blurs the Recent Apps preview).
 *   On iOS it enables the plugin's app-switcher blur and screen-capture
 *   detection.
 *
 * Nothing here fires unless a caller mounts <PrivacyGuard/>, so normal
 * chats are unaffected.
 */

type PrivacyPlugin = {
  enable?: () => Promise<unknown> | unknown;
  disable?: () => Promise<unknown> | unknown;
};

type CapacitorGlobal = {
  Plugins?: Record<string, PrivacyPlugin | undefined>;
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getPlugin(): PrivacyPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.Plugins) return null;
  return (
    cap.Plugins.PrivacyScreen ??
    cap.Plugins.Privacy ??
    cap.Plugins.ScreenProtector ??
    null
  );
}

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function getPlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "ios" || p === "android") return p;
  return "web";
}

let refCount = 0;

/** Enable native privacy protection. Ref-counted so nested guards are safe. */
export async function enableNativePrivacy(): Promise<void> {
  refCount += 1;
  if (refCount !== 1) return;
  const plugin = getPlugin();
  try {
    await plugin?.enable?.();
  } catch {
    /* no-op — plugin missing or shell-only */
  }
}

/** Disable native privacy protection (only when the last guard unmounts). */
export async function disableNativePrivacy(): Promise<void> {
  refCount = Math.max(0, refCount - 1);
  if (refCount !== 0) return;
  const plugin = getPlugin();
  try {
    await plugin?.disable?.();
  } catch {
    /* no-op */
  }
}
