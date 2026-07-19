import { useState } from "react";
import { motion } from "framer-motion";
import { Shuffle, Check } from "lucide-react";

const POOL = ["Echo", "Cipher", "Ash", "Ghost", "Nocturne", "Obsidian", "Drift", "Nova", "Vesper", "Onyx", "Ember", "Halcyon", "Solstice", "Rune", "Wren", "Zephyr", "Lyric", "Sable", "Cinder", "Marlow"];

function randomAlias() {
  return POOL[Math.floor(Math.random() * POOL.length)] + Math.floor(10 + Math.random() * 90);
}

interface Props {
  onPick: (alias: string | null) => void; // null = server-assigned random
  busy?: boolean;
}

export function IdentityPicker({ onPick, busy }: Props) {
  const [mode, setMode] = useState<"random" | "custom">("random");
  const [random, setRandom] = useState(randomAlias);
  const [custom, setCustom] = useState("");
  const validCustom = /^[A-Za-z][A-Za-z0-9_]{1,15}$/.test(custom.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm mx-auto text-center"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Your identity</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Choose a mask</h2>
      <p className="mt-1.5 text-[13px] text-white/50">This is who you are inside. Nobody will ever know it's you.</p>

      <div className="mt-6 flex justify-center gap-1.5">
        <button onClick={() => setMode("random")}
          className={`px-4 py-1.5 rounded-full text-xs border transition-colors ${mode === "random" ? "bg-white text-black border-white" : "border-white/10 text-white/60"}`}>
          Random
        </button>
        <button onClick={() => setMode("custom")}
          className={`px-4 py-1.5 rounded-full text-xs border transition-colors ${mode === "custom" ? "bg-white text-black border-white" : "border-white/10 text-white/60"}`}>
          Custom
        </button>
      </div>

      <div className="mt-6">
        {mode === "random" ? (
          <div className="flex items-center justify-center gap-2">
            <motion.div key={random}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-semibold tracking-wide text-white">
              {random}
            </motion.div>
            <button onClick={() => setRandom(randomAlias())} className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/25">
              <Shuffle className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <input
            autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
            placeholder="Pick a name"
            maxLength={16}
            className="w-full text-center text-2xl font-semibold bg-transparent border-b border-white/15 text-white focus:outline-none focus:border-white pb-2"
          />
        )}
        {mode === "custom" && custom && !validCustom && (
          <p className="text-[11px] text-red-400 mt-2">2–16 chars, letters/numbers/underscore, must start with a letter.</p>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} disabled={busy || (mode === "custom" && !validCustom)}
        onClick={() => onPick(mode === "random" ? null : custom.trim())}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3 text-sm font-semibold disabled:opacity-50">
        <Check className="h-4 w-4" />
        Enter as {mode === "random" ? random : (custom.trim() || "…")}
      </motion.button>
    </motion.div>
  );
}
