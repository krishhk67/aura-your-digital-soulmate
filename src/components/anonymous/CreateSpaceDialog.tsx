import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAnonymousSpaceActions } from "@/hooks/useAnonymousSpace";

interface Props {
  open: boolean;
  onClose: () => void;
  groupChatId: string | null;
  onCreated?: (spaceId: string) => void;
}

const CAPS = [2, 4, 8, 16, 32] as const;
const TIMERS: { label: string; minutes: number | null }[] = [
  { label: "No timer", minutes: null },
  { label: "15 min", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "24 hours", minutes: 1440 },
];

export function CreateSpaceDialog({ open, onClose, groupChatId, onCreated }: Props) {
  const { create } = useAnonymousSpaceActions();
  const [title, setTitle] = useState("");
  const [cap, setCap] = useState<number | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!groupChatId) return;
    setBusy(true);
    const { spaceId, error } = await create({
      groupChatId,
      title: title.trim() || undefined,
      maxParticipants: cap ?? undefined,
      autoCloseMinutes: timer ?? undefined,
    });
    setBusy(false);
    if (error || !spaceId) return toast.error(error?.message ?? "Could not create space");
    toast.success("Anonymous Space opened");
    onCreated?.(spaceId);
    setTitle(""); setCap(null); setTimer(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[70] mx-auto max-w-md rounded-3xl border border-white/10 bg-[#141417] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                  <Sparkles className="h-3 w-3" /> Anonymous Space
                </div>
                <h2 className="text-lg font-semibold mt-1 text-white">Open a temporary space</h2>
                <p className="text-xs text-white/50 mt-1">Identities vanish. Nothing is saved. When everyone leaves, it's gone forever.</p>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-xs text-white/60 mb-1.5">Space title (optional)</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40}
              placeholder="e.g. Late-night thoughts"
              className="w-full rounded-xl bg-[#1C1C20] border border-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />

            <label className="block text-xs text-white/60 mt-4 mb-1.5">Max participants</label>
            <div className="flex flex-wrap gap-1.5">
              {[null, ...CAPS].map((n, i) => (
                <button key={i} onClick={() => setCap(n)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${cap === n ? "bg-white text-black border-white" : "border-white/10 text-white/70 hover:border-white/25"}`}>
                  {n === null ? "No limit" : n}
                </button>
              ))}
            </div>

            <label className="block text-xs text-white/60 mt-4 mb-1.5">Auto-close</label>
            <div className="flex flex-wrap gap-1.5">
              {TIMERS.map(t => (
                <button key={t.label} onClick={() => setTimer(t.minutes)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${timer === t.minutes ? "bg-white text-black border-white" : "border-white/10 text-white/70 hover:border-white/25"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <motion.button whileTap={{ scale: 0.98 }} onClick={submit} disabled={busy}
              className="mt-6 w-full rounded-xl bg-white text-black py-3 text-sm font-semibold disabled:opacity-60">
              {busy ? "Opening..." : "Open Anonymous Space"}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
