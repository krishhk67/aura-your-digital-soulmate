import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onDone: () => void;
}

/** ~800ms cinematic fade. Tap accelerates the remaining animation. */
export function EnterTransition({ onDone }: Props) {
  const [fast, setFast] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShowSkip(true), 200);
    const t2 = window.setTimeout(onDone, 850);
    try { navigator.vibrate?.(12); } catch { /* noop */ }
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [onDone]);

  useEffect(() => {
    if (!fast) return;
    const t = window.setTimeout(onDone, 220);
    return () => window.clearTimeout(t);
  }, [fast, onDone]);

  return (
    <motion.div
      onClick={() => setFast(true)}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: fast ? 0.18 : 0.35 }}
      className="fixed inset-0 z-[80] bg-[#0B0B0D] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: fast ? 0.2 : 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/30 to-cyan-400/20 blur-xl absolute inset-0" />
        <div className="relative h-24 w-24 rounded-full border border-white/20 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="h-full w-full rounded-full border-t border-white/60"
          />
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-6 text-[10px] uppercase tracking-[0.4em] text-white/50"
      >
        Concealing your identity
      </motion.p>
      {showSkip && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.35 }}
          className="absolute bottom-10 text-[11px] text-white/40">
          Tap anywhere to skip
        </motion.p>
      )}
    </motion.div>
  );
}
