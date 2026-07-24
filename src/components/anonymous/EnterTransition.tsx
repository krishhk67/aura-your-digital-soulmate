import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  onDone: () => void;
}

/**
 * Vortex-style entry transition (~800ms):
 * chat darkens → subtle inward distortion → particles drift to focal point →
 * brief dark vortex → collapse to black → space emerges from center.
 * Tapping accelerates the remainder without cutting.
 */
export function EnterTransition({ onDone }: Props) {
  const reduce = useReducedMotion();
  const [fast, setFast] = useState(false);
  const startRef = useRef<number>(performance.now());
  const doneRef = useRef(false);

  const DURATION = reduce ? 260 : 820;

  useEffect(() => {
    try { navigator.vibrate?.(8); } catch { /* noop */ }
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, DURATION);
    return () => window.clearTimeout(t);
  }, [DURATION, onDone]);

  // Tap-to-accelerate: shorten remainder to ~180ms, no hard cut.
  useEffect(() => {
    if (!fast || doneRef.current) return;
    const elapsed = performance.now() - startRef.current;
    const remaining = Math.max(0, DURATION - elapsed);
    const shortened = Math.min(remaining, 180);
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, shortened);
    return () => window.clearTimeout(t);
  }, [fast, DURATION, onDone]);

  const particles = useMemo(
    () =>
      Array.from({ length: reduce ? 0 : 22 }).map((_, i) => {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.6;
        const radius = 140 + Math.random() * 160;
        return {
          id: i,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 1 + Math.random() * 1.6,
          delay: Math.random() * 0.12,
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
      transition={{ duration: 0.18 * speed, ease: "easeOut" }}
      className="fixed inset-0 z-[80] cursor-pointer overflow-hidden"
      aria-hidden
    >
      {/* Darkening veil over the outgoing chat */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 1] }}
        transition={{ duration: 0.65 * speed, ease: [0.4, 0, 0.2, 1], times: [0, 0.6, 1] }}
        className="absolute inset-0 bg-black"
      />

      {/* Radial inward pull — the "distortion toward a focal point" */}
      <motion.div
        initial={{ opacity: 0, scale: 1.15 }}
        animate={{ opacity: [0, 0.9, 1], scale: [1.15, 1, 0.85] }}
        transition={{ duration: 0.7 * speed, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,1) 78%)",
        }}
      />

      {/* Faint vortex ring — no spinner, just a hint of depth */}
      <motion.div
        initial={{ opacity: 0, scale: 1.4, rotate: 0 }}
        animate={{ opacity: [0, 0.35, 0], scale: [1.4, 0.6, 0.2], rotate: 90 }}
        transition={{ duration: 0.75 * speed, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 40%, rgba(255,255,255,0.05) 70%, rgba(255,255,255,0) 100%)",
          filter: "blur(6px)",
        }}
      />

      {/* Particles drifting inward */}
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
            animate={{ x: 0, y: 0, opacity: [0, 0.7, 0], scale: 0.2 }}
            transition={{
              duration: 0.7 * speed,
              delay: p.delay * speed,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="absolute rounded-full bg-white/70"
            style={{ width: p.size, height: p.size }}
          />
        ))}
      </div>

      {/* Final collapse — brief absolute black before the space emerges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: 0.8 * speed, ease: "easeInOut", times: [0, 0.75, 1] }}
        className="absolute inset-0 bg-black"
      />
    </motion.div>
  );
}
