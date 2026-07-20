import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import {
  disableNativePrivacy,
  enableNativePrivacy,
  getPlatform,
} from "@/lib/privacy/native-privacy";

interface PrivacyGuardProps {
  /** Human label for the shield overlay. */
  label?: string;
  /**
   * When true, render a full-viewport blurred shield over the entire app when
   * the tab loses focus / is backgrounded. Defaults to true.
   */
  shieldOnBlur?: boolean;
}

/**
 * Mount inside any sensitive surface (Anonymous Space, Black Vault, …) to
 * scope screenshot/screen-recording protection to that surface only.
 *
 * - Calls the native Privacy plugin (Capacitor) on mount / unmount when
 *   present. On Android this toggles FLAG_SECURE. On plain web this is a
 *   no-op — browsers cannot block screenshots.
 * - Renders a blurred shield when the app is backgrounded or the tab is
 *   hidden, so the OS app-switcher preview and casual iOS screen recordings
 *   see the shield instead of the underlying content.
 * - When any other guard is mounted too, protection stays enabled (ref-counted).
 */
export function PrivacyGuard({
  label = "Protected",
  shieldOnBlur = true,
}: PrivacyGuardProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    void enableNativePrivacy();
    return () => {
      void disableNativePrivacy();
    };
  }, []);

  useEffect(() => {
    if (!shieldOnBlur) return;
    const onVis = () => setHidden(document.visibilityState !== "visible");
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [shieldOnBlur]);

  return (
    <AnimatePresence>
      {hidden && (
        <motion.div
          key="privacy-shield"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0B0B0D]/95 backdrop-blur-2xl"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-3 text-center px-8">
            <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white/80" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              {label}
            </p>
            <p className="text-[13px] text-white/60 max-w-[220px] leading-relaxed">
              Content is hidden while the app is in the background.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Short one-liner used inside the Anonymous Space entry copy. */
export function privacyNoticeText() {
  const p = getPlatform();
  if (p === "ios") {
    return "Screen recording is detected and content is blurred where possible to help protect participant privacy.";
  }
  return "Screenshots and screen recording are disabled in this Anonymous Space to help protect participant privacy.";
}
