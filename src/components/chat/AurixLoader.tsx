import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const PHRASES = [
  "Preparing Aurix",
  "Encrypting conversations",
  "Establishing secure tunnel",
  "Syncing messages",
  "Almost ready",
];

const EMERALD = "#10b981";
const EMERALD_SOFT = "#6ee7b7";

/* ---------------- Aurix Logo (2D SVG) ---------------- */

function AurixMark({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="aurix-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={EMERALD_SOFT} />
          <stop offset="50%" stopColor={EMERALD} />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="aurix-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={EMERALD} stopOpacity="0.15" />
          <stop offset="100%" stopColor={EMERALD} stopOpacity="0.02" />
        </linearGradient>
        <filter id="aurix-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Filled A silhouette */}
      <motion.path
        d="M50 12 L82 84 L68 84 L61 68 L39 68 L32 84 L18 84 Z M44 56 L56 56 L50 32 Z"
        fill="url(#aurix-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Stroke draw */}
      <motion.path
        d="M50 12 L82 84 L68 84 L61 68 L39 68 L32 84 L18 84 Z"
        stroke="url(#aurix-stroke)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        filter="url(#aurix-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 2.2, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.6 } }}
      />
      <motion.path
        d="M44 56 L56 56 L50 32 Z"
        stroke="url(#aurix-stroke)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
        filter="url(#aurix-glow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 1.6, ease: [0.65, 0, 0.35, 1], delay: 0.6 }, opacity: { duration: 0.6, delay: 0.6 } }}
      />
    </svg>
  );
}

/* ---------------- Rings ---------------- */

function Ring({
  size,
  delay = 0,
  duration = 8,
  opacity = 0.35,
  dashed = false,
}: {
  size: number;
  delay?: number;
  duration?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px ${dashed ? "dashed" : "solid"} ${EMERALD}`,
        opacity,
        boxShadow: `0 0 24px ${EMERALD}22, inset 0 0 24px ${EMERALD}11`,
      }}
      animate={{ rotate: 360, scale: [1, 1.04, 1] }}
      transition={{
        rotate: { duration, repeat: Infinity, ease: "linear", delay },
        scale: { duration: duration / 2, repeat: Infinity, ease: "easeInOut" },
      }}
    />
  );
}

function PulseRing({ size, delay = 0 }: { size: number; delay?: number }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${EMERALD}`,
      }}
      initial={{ scale: 0.7, opacity: 0.6 }}
      animate={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut", delay }}
    />
  );
}

/* ---------------- Orbiting particles ---------------- */

function Orbit({
  radius,
  duration,
  size = 3,
  offset = 0,
  reverse = false,
}: {
  radius: number;
  duration: number;
  size?: number;
  offset?: number;
  reverse?: boolean;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        transformOrigin: "50% 50%",
      }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear", delay: offset }}
    >
      <motion.div
        style={{
          position: "absolute",
          top: -size / 2,
          left: `calc(50% - ${size / 2}px)`,
          width: size,
          height: size,
          borderRadius: "50%",
          background: EMERALD_SOFT,
          boxShadow: `0 0 12px ${EMERALD}, 0 0 24px ${EMERALD}`,
        }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: offset }}
      />
    </motion.div>
  );
}

/* ---------------- Floating particles ---------------- */

function Particles({ count = 28 }: { count?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.6,
        dur: Math.random() * 6 + 6,
        delay: Math.random() * 4,
        opacity: Math.random() * 0.5 + 0.15,
      })),
    [count]
  );

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {items.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: EMERALD_SOFT,
            boxShadow: `0 0 6px ${EMERALD}`,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 1.8, p.opacity],
          }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ---------------- Loader Shell ---------------- */

export function AurixLoader() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHRASES.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      data-aurix-loader
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: "blur(12px)" }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#000",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Ambient emerald radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(50% 40% at 50% 50%, rgba(16,185,129,0.18), transparent 70%), radial-gradient(80% 60% at 50% 100%, rgba(16,185,129,0.08), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Grain / noise (very subtle) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.035,
          mixBlendMode: "overlay",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          pointerEvents: "none",
        }}
      />

      <Particles />

      {/* Centerpiece stage */}
      <div
        style={{
          position: "relative",
          width: 340,
          height: 340,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Soft halo behind logo */}
        <motion.div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${EMERALD}55, transparent 65%)`,
            filter: "blur(20px)",
          }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rings */}
        {!reduce && (
          <>
            <Ring size={320} duration={22} opacity={0.18} dashed />
            <Ring size={260} duration={16} opacity={0.28} />
            <Ring size={200} duration={11} opacity={0.4} dashed />
            <PulseRing size={220} />
            <PulseRing size={220} delay={1.7} />
          </>
        )}

        {/* Orbiting particles */}
        {!reduce && (
          <>
            <Orbit radius={100} duration={7} size={4} />
            <Orbit radius={130} duration={11} size={3} offset={1.2} reverse />
            <Orbit radius={160} duration={15} size={2.5} offset={2.4} />
          </>
        )}

        {/* Logo with breathing / float / soft rotation */}
        <motion.div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: `drop-shadow(0 0 20px ${EMERALD}aa)`,
          }}
          animate={{
            scale: [1, 1.05, 1],
            y: [0, -6, 0],
            rotate: [-2, 2, -2],
          }}
          transition={{
            scale: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <AurixMark size={130} />

          {/* Shimmer sweep */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 24,
              overflow: "hidden",
              pointerEvents: "none",
              WebkitMaskImage:
                "radial-gradient(circle at 50% 50%, black 55%, transparent 70%)",
              maskImage:
                "radial-gradient(circle at 50% 50%, black 55%, transparent 70%)",
            }}
          >
            <motion.div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "40%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                filter: "blur(2px)",
              }}
              initial={{ x: "-120%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Text + progress */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          pointerEvents: "none",
        }}
      >
        <div style={{ height: 22, position: "relative", width: "min(320px, 78vw)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                textAlign: "center",
                fontSize: 13,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.78)",
                fontWeight: 500,
              }}
            >
              {PHRASES[i]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Glass capsule progress line */}
        <div
          style={{
            width: "min(240px, 64vw)",
            height: 3,
            borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
            position: "relative",
            backdropFilter: "blur(8px)",
            boxShadow: `0 0 20px ${EMERALD}44, inset 0 0 6px rgba(0,0,0,0.6)`,
          }}
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.8, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${EMERALD}55 30%, ${EMERALD_SOFT} 50%, ${EMERALD}55 70%, transparent 100%)`,
              filter: "blur(0.4px)",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.5em",
            color: "rgba(255,255,255,0.32)",
            fontWeight: 600,
            paddingLeft: "0.5em",
          }}
        >
          AURIX
        </div>
      </div>
    </motion.div>
  );
}

export default AurixLoader;
