import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const PHRASES = [
  "Preparing secure connection",
  "Encrypting conversations",
  "Syncing chats",
  "Launching Aurix",
  "Almost ready",
];

const EMERALD = "#10b981";
const EMERALD_SOFT = "rgba(16,185,129,0.55)";
const EMERALD_FAINT = "rgba(16,185,129,0.18)";

/**
 * Aurix signature loader.
 * Original stylized matte-black figurine performing continuous
 * glide-in-place footwork. No celebrity/choreography references.
 */
export function AurixLoader() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHRASES.length), 1900);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      data-aurix-loader
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000000",
        color: "rgba(255,255,255,0.92)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Emerald ambient glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 55% 45% at 50% 50%, ${EMERALD_FAINT}, transparent 70%), radial-gradient(ellipse 40% 25% at 50% 88%, rgba(16,185,129,0.22), transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Floating particles */}
      {!reduce && (
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {Array.from({ length: 22 }).map((_, k) => {
            const left = (k * 41) % 100;
            const top = (k * 59) % 100;
            const dur = 7 + (k % 6) * 1.2;
            const delay = (k % 8) * 0.35;
            const size = 1.5 + (k % 4) * 0.8;
            return (
              <motion.span
                key={k}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  borderRadius: 999,
                  background: EMERALD_SOFT,
                  filter: "blur(1px)",
                  boxShadow: `0 0 8px ${EMERALD_SOFT}`,
                }}
                animate={{ y: [0, -40, 0], opacity: [0, 0.85, 0] }}
                transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
              />
            );
          })}
        </div>
      )}

      {/* Vignette */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Character stage */}
      <div
        style={{
          position: "relative",
          width: 260,
          height: 340,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {/* Floor glow / reflection */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            width: 180,
            height: 40,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${EMERALD_SOFT}, transparent 70%)`,
            filter: "blur(10px)",
          }}
          animate={reduce ? {} : { opacity: [0.45, 0.75, 0.45], scaleX: [1, 1.08, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Under-figure shadow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 26,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 14,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.85)",
            filter: "blur(6px)",
          }}
        />

        <Figurine reduce={!!reduce} />
      </div>

      {/* Wordmark + phrase */}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: "28px",
            fontWeight: 600,
            letterSpacing: "0.42em",
            color: "rgba(255,255,255,0.94)",
            textShadow: `0 0 18px ${EMERALD_SOFT}`,
          }}
        >
          AURIX
        </h1>
        <div style={{ marginTop: 14, height: 20, overflow: "hidden", minWidth: 260 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.75, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: "20px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {PHRASES[i]}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Glowing progress line */}
      <div
        style={{
          position: "relative",
          marginTop: 22,
          width: 208,
          height: 2,
          overflow: "hidden",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "35%",
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${EMERALD}, ${EMERALD_SOFT}, transparent)`,
            boxShadow: `0 0 14px ${EMERALD}`,
          }}
          animate={{ x: ["-140%", "320%"] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

/**
 * SVG figurine. Matte-black body with a soft emerald rim.
 * Continuous glide-in-place: torso sway, breathing, arm swing,
 * shoulder roll, and alternating leg heel-to-toe slides —
 * original sequence, not modeled on any specific performer.
 */
function Figurine({ reduce }: { reduce: boolean }) {
  const still = reduce;

  return (
    <svg
      viewBox="0 0 200 320"
      width="200"
      height="320"
      style={{ position: "relative", display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="55%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(16,185,129,0.0)" />
          <stop offset="50%" stopColor="rgba(16,185,129,0.55)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.0)" />
        </linearGradient>
        <filter id="rimGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Whole-body sway + breathing */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "100px 280px" }}
        animate={
          still
            ? {}
            : {
                x: [0, 2.5, 0, -2.5, 0],
                rotate: [0, 1.2, 0, -1.2, 0],
                y: [0, -1.5, 0, -1, 0],
              }
        }
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Legs — alternating heel-to-toe slide in place */}
        {/* Left leg */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "92px 200px" }}
          animate={
            still
              ? {}
              : { rotate: [0, -6, 0, 4, 0], x: [0, -3, 0, 2, 0] }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M92 200 Q88 240 84 268 Q82 278 78 284"
            stroke="url(#bodyGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />
          {/* Foot */}
          <motion.ellipse
            cx="76"
            cy="286"
            rx="16"
            ry="6"
            fill="url(#bodyGrad)"
            animate={
              still
                ? {}
                : { cy: [286, 282, 286, 288, 286], rx: [16, 14, 16, 17, 16] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.g>

        {/* Right leg (opposite phase) */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "108px 200px" }}
          animate={
            still
              ? {}
              : { rotate: [0, 6, 0, -4, 0], x: [0, 3, 0, -2, 0] }
          }
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
        >
          <path
            d="M108 200 Q112 240 116 268 Q118 278 122 284"
            stroke="url(#bodyGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />
          <motion.ellipse
            cx="124"
            cy="286"
            rx="16"
            ry="6"
            fill="url(#bodyGrad)"
            animate={
              still
                ? {}
                : { cy: [286, 288, 286, 282, 286], rx: [16, 17, 16, 14, 16] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.g>

        {/* Torso */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "100px 150px" }}
          animate={still ? {} : { scaleY: [1, 1.02, 1], rotate: [0, 0.8, 0, -0.8, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M78 118 Q72 160 84 205 L116 205 Q128 160 122 118 Z"
            fill="url(#bodyGrad)"
            filter="url(#rimGlow)"
          />
          {/* Rim light along the shoulder/side */}
          <path
            d="M78 120 Q72 160 84 202"
            stroke="url(#rim)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.9"
          />
          <path
            d="M122 120 Q128 160 116 202"
            stroke="url(#rim)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.5"
          />
        </motion.g>

        {/* Left arm */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "80px 122px" }}
          animate={
            still
              ? {}
              : { rotate: [0, 12, 0, -10, 0], x: [0, -1.5, 0, 1, 0] }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M80 122 Q66 160 62 200"
            stroke="url(#bodyGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="62" cy="204" r="8" fill="url(#bodyGrad)" />
        </motion.g>

        {/* Right arm (opposite phase) */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "120px 122px" }}
          animate={
            still
              ? {}
              : { rotate: [0, -12, 0, 10, 0], x: [0, 1.5, 0, -1, 0] }
          }
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
        >
          <path
            d="M120 122 Q134 160 138 200"
            stroke="url(#bodyGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="138" cy="204" r="8" fill="url(#bodyGrad)" />
        </motion.g>

        {/* Neck + Head (no features) */}
        <rect x="94" y="104" width="12" height="16" rx="4" fill="url(#bodyGrad)" />
        <motion.ellipse
          cx="100"
          cy="88"
          rx="24"
          ry="28"
          fill="url(#bodyGrad)"
          filter="url(#rimGlow)"
          animate={still ? {} : { cy: [88, 87, 88], rx: [24, 24.4, 24] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Head rim highlight */}
        <path
          d="M80 82 Q88 62 108 62"
          stroke="url(#rim)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.85"
        />
      </motion.g>
    </svg>
  );
}
