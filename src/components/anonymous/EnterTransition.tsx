import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  onDone: () => void;
}

/**
 * Anonymous Space entry — a single continuous transformation.
 *
 * Act 1 (0–200ms)   Tap feedback: a whisper-thin ring pulses from the touch point.
 * Act 2 (200–500ms) Reality distortion: the outgoing chat (data-chat-surface) is
 *                   pulled inward — scale, rotate, blur, desaturate — under
 *                   gravitational easing. A faint lens ripple sits over it.
 * Act 3 (500–700ms) Collapse: everything folds into a single luminous point,
 *                   then the screen goes almost fully dark (~150ms of quiet).
 * Act 4 (700–850ms) Reconstruction: that same point expands outward as an iris,
 *                   handing off to the Anonymous Space rebuilding underneath.
 *
 * Tap anywhere → accelerate the remainder smoothly (never a hard cut).
 * Reduced motion → compresses into a ~260ms cross-dissolve.
 */
export function EnterTransition({ onDone }: Props) {
  const reduce = useReducedMotion();
  const [fast, setFast] = useState(false);
  const [act, setAct] = useState<1 | 2 | 3 | 4>(1);
  const startRef = useRef<number>(performance.now());
  const doneRef = useRef(false);

  const TOTAL = reduce ? 260 : 850;

  // Warp the underlying chat surface for the full distortion+collapse window.
  useEffect(() => {
    // Kick off distortion just after the tap-feedback beat.
    const t2 = window.setTimeout(() => {
      document.body.classList.add("aurix-warping");
      setAct(2);
    }, reduce ? 20 : 180);
    const t3 = window.setTimeout(() => setAct(3), reduce ? 120 : 500);
    const t4 = window.setTimeout(() => setAct(4), reduce ? 200 : 700);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      document.body.classList.remove("aurix-warping");
      document.body.classList.remove("aurix-warping-fast");
    };
  }, [reduce]);

  useEffect(() => {
    try { navigator.vibrate?.(6); } catch { /* noop */ }
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, TOTAL);
    return () => window.clearTimeout(t);
  }, [TOTAL, onDone]);

  // Tap-to-accelerate: shorten remainder, never jump-cut.
  useEffect(() => {
    if (!fast || doneRef.current) return;
    document.body.classList.add("aurix-warping-fast");
    const elapsed = performance.now() - startRef.current;
    const remaining = Math.max(0, TOTAL - elapsed);
    const shortened = Math.min(remaining, 220);
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, shortened);
    return () => window.clearTimeout(t);
  }, [fast, TOTAL, onDone]);

  const speed = fast ? 0.4 : 1;

  return (
    <motion.div
      onClick={() => setFast(true)}
      initial={{ opacity: 1 }}
      className="fixed inset-0 z-[80] cursor-pointer overflow-hidden"
      aria-hidden
    >
      {/* Act 1 — tap-feedback ring. A single hairline pulse, gone by 220ms. */}
      <motion.span
        initial={{ scale: 0.2, opacity: 0.55 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: 0.42 * speed, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full border border-white/25"
        style={{ boxShadow: "0 0 30px rgba(255,255,255,0.08) inset" }}
      />

      {/* Act 2 — reality distortion. A subtle lensing halo sitting over the
          warping chat; conic sheen suggests refraction, never a spinner. */}
      <motion.div
        initial={{ opacity: 0, scale: 1.15, rotate: 0 }}
        animate={
          act >= 2
            ? { opacity: [0, 0.28, 0.18, 0], scale: [1.15, 0.9, 0.5, 0.08], rotate: 24 }
            : { opacity: 0 }
        }
        transition={{ duration: 0.62 * speed, ease: [0.55, 0, 0.75, 0] }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "conic-gradient(from 210deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 30%, rgba(255,255,255,0.06) 62%, rgba(255,255,255,0) 100%)",
          filter: "blur(14px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Act 2/3 — gravitational vignette. Darkness deepens from the edges
          inward as the chat implodes toward the focal point. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={act >= 2 ? { opacity: [0, 0.55, 0.98, 1] } : { opacity: 0 }}
        transition={{ duration: 0.6 * speed, ease: [0.55, 0, 0.75, 0], times: [0, 0.4, 0.85, 1] }}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.92) 70%, #000 100%)",
        }}
      />

      {/* Act 3 — the point. All remaining light collapses into a single
          luminous pixel that lingers briefly in the dark before the rebirth. */}
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={
          act >= 3
            ? { opacity: [0, 1, 1, 0.9], scale: [0, 1, 1, 1.05] }
            : { opacity: 0, scale: 0 }
        }
        transition={{ duration: 0.22 * speed, ease: "easeOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 4,
          height: 4,
          background: "white",
          boxShadow:
            "0 0 12px 2px rgba(255,255,255,0.85), 0 0 40px 6px rgba(255,255,255,0.35), 0 0 90px 20px rgba(180,167,255,0.18)",
        }}
      />

      {/* Act 4 — iris expansion. A radial mask opens outward from the point,
          revealing the reconstructed Anonymous Space beneath. */}
      <motion.div
        initial={{ clipPath: "circle(100% at 50% 50%)" }}
        animate={act >= 4 ? { clipPath: "circle(0% at 50% 50%)" } : { clipPath: "circle(100% at 50% 50%)" }}
        transition={{ duration: 0.28 * speed, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-black"
      />
    </motion.div>
  );
}
