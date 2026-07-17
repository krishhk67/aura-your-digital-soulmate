import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";

const PHRASES = [
  "Preparing your conversations",
  "Connecting securely",
  "Syncing messages",
  "Launching Aurix",
  "Almost ready",
];

// Helpers: build translucent variants of the theme's primary color.
// Tokens are stored as oklch(...) so we mix through color-mix.
const mix = (pct: number) => `color-mix(in oklab, var(--primary) ${pct}%, transparent)`;

export function AurixLoader() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHRASES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Ambient radial gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${mix(22)}, transparent 70%), radial-gradient(ellipse 40% 30% at 50% 90%, ${mix(14)}, transparent 70%)`,
        }}
      />

      {/* Floating particles */}
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }).map((_, k) => {
            const left = (k * 37) % 100;
            const top = (k * 53) % 100;
            const dur = 8 + (k % 5) * 1.4;
            const delay = (k % 7) * 0.4;
            const size = 2 + (k % 3);
            return (
              <motion.span
                key={k}
                className="absolute rounded-full bg-white/40"
                style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, filter: "blur(1px)" }}
                animate={{ y: [0, -30, 0], opacity: [0, 0.7, 0] }}
                transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
              />
            );
          })}
        </div>
      )}

      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)" }}
      />

      <div className="relative flex flex-col items-center gap-10 px-6">
        {/* Logo stack */}
        <div className="relative h-32 w-32">
          {!reduce && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${mix(55)}, transparent 65%)`, filter: "blur(24px)" }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.95, 0.6] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -inset-6 rounded-full border border-white/10"
                animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute -inset-6 rounded-full border border-white/10"
                animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
                transition={{ duration: 2.6, delay: 1.3, repeat: Infinity, ease: "easeOut" }}
              />
            </>
          )}

          {/* Glass disc */}
          <motion.div
            className="absolute inset-0 rounded-[28px] border border-white/10 backdrop-blur-xl"
            style={{
              background: `linear-gradient(145deg, ${mix(45)}, ${mix(8)} 60%, transparent), radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4), transparent 45%)`,
              boxShadow: `0 30px 60px -20px ${mix(55)}, inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -20px 40px rgba(0,0,0,0.45)`,
            }}
            animate={reduce ? {} : { y: [0, -6, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              aria-hidden
              className="absolute inset-0 rounded-[28px] opacity-70"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.05) 32%, transparent 55%)",
                mixBlendMode: "overlay",
              }}
            />
            <div className="absolute inset-0 grid place-items-center">
              <motion.div
                animate={reduce ? {} : { scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <MessageCircle
                  className="h-12 w-12 text-white"
                  strokeWidth={1.6}
                  style={{ filter: `drop-shadow(0 4px 14px ${mix(85)})` }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="font-display text-2xl font-semibold tracking-[0.35em] text-white/90">
            AURIX
          </h1>
          <div className="mt-3 h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.75, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-[13px] font-medium tracking-wide text-white/70"
              >
                {PHRASES[i]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Capsule progress */}
        <div className="relative h-[3px] w-48 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, var(--primary), ${mix(80)}, transparent)`,
              boxShadow: `0 0 16px ${mix(80)}`,
            }}
            animate={{ x: ["-140%", "300%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
