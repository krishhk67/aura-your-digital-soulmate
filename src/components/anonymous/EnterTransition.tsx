import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  onDone: () => void;
}

/**
 * Signature Anonymous Space entry (~820ms).
 * The outgoing chat itself warps (scales, blurs, dims) via a global body class
 * that targets [data-chat-surface]. On top, a soft inward vignette, a faint
 * vortex sheen and a handful of particles drift from the message band toward
 * center, then everything collapses into black so the space can emerge.
 * Tap accelerates the remaining animation without cutting it.
 */
export function EnterTransition({ onDone }: Props) {
  const reduce = useReducedMotion();
  const [fast, setFast] = useState(false);
  const startRef = useRef<number>(performance.now());
  const doneRef = useRef(false);

  const DURATION = reduce ? 260 : 820;

  // Warp the underlying chat surface for the entire transition.
  useEffect(() => {
    document.body.classList.add("aurix-warping");
    return () => {
      document.body.classList.remove("aurix-warping");
      document.body.classList.remove("aurix-warping-fast");
    };
  }, []);

  useEffect(() => {
    try { navigator.vibrate?.(8); } catch { /* noop */ }
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, DURATION);
    return () => window.clearTimeout(t);
  }, [DURATION, onDone]);

  // Tap-to-accelerate: shorten the outgoing animation cleanly (no jump-cut).
  useEffect(() => {
    if (!fast || doneRef.current) return;
    document.body.classList.add("aurix-warping-fast");
    const elapsed = performance.now() - startRef.current;
    const remaining = Math.max(0, DURATION - elapsed);
    const shortened = Math.min(remaining, 180);
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, shortened);
    return () => window.clearTimeout(t);
  }, [fast, DURATION, onDone]);

  // Particles rise from a horizontal band (where messages live) and drift inward.
  const particles = useMemo(
    () =>
      Array.from({ length: reduce ? 0 : 14 }).map((_, i) => {
        const spread = 260;
        return {
          id: i,
          x: (Math.random() - 0.5) * spread * 2,
          y: (Math.random() - 0.5) * 220 + 40,
          size: 1 + Math.random() * 1.4,
          delay: Math.random() * 0.14,
        };
      }),
    [reduce]
  );

  const speed = fast ? 0.35 : 1;

  return (
    <motion.div
      onClick={() => setFast(true)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 * speed, ease: "easeOut" }}
      className="fixed inset-0 z-[80] cursor-pointer overflow-hidden"
      aria-hidden
    >
      {/* Soft inward vignette — pulls the eye to the focal point without a spinner */}
      <motion.div
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: [0, 0.95, 1], scale: [1.2, 1, 0.82] }}
        transition={{ duration: 0.75 * speed, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.95) 78%)",
        }}
      />

      {/* Faint vortex sheen — a hint of rotation, never a ring */}
      <motion.div
        initial={{ opacity: 0, scale: 1.35, rotate: 0 }}
        animate={{ opacity: [0, 0.22, 0], scale: [1.35, 0.5, 0.18], rotate: 55 }}
        transition={{ duration: 0.72 * speed, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 35%, rgba(255,255,255,0.06) 68%, rgba(255,255,255,0) 100%)",
          filter: "blur(10px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Particles drifting inward from the message band */}
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
            animate={{ x: 0, y: 0, opacity: [0, 0.6, 0], scale: 0.15 }}
            transition={{
              duration: 0.72 * speed,
              delay: p.delay * speed,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="absolute rounded-full bg-white/70"
            style={{ width: p.size, height: p.size }}
          />
        ))}
      </div>

      {/* Final collapse to black — the doorway closes before the space emerges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: 0.82 * speed, ease: "easeInOut", times: [0, 0.72, 1] }}
        className="absolute inset-0 bg-black"
      />
    </motion.div>
  );
}
