import { motion, AnimatePresence } from "framer-motion";
import { Ghost, X } from "lucide-react";

interface Props {
  open: boolean;
  current: number | null;
  onSelect: (seconds: number | null) => void;
  onClose: () => void;
}

const OPTIONS: { label: string; value: number | null }[] = [
  { label: "Off", value: null },
  { label: "1s", value: 1 },
  { label: "2s", value: 2 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
];

export function GhostTimerPicker({ open, current, onSelect, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#141417] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <Ghost className="h-3.5 w-3.5" /> Ghost timer
              </div>
              <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-white/5 flex items-center justify-center text-white/60">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[12px] text-white/50 mb-3">Timer starts after the recipient reveals your message. Then it disappears forever.</p>
            <div className="grid grid-cols-4 gap-1.5">
              {OPTIONS.map(opt => (
                <button key={opt.label}
                  onClick={() => { onSelect(opt.value); onClose(); }}
                  className={`py-2 rounded-xl text-[12.5px] border transition-colors ${current === opt.value ? "bg-white text-black border-white" : "border-white/10 text-white/70 hover:border-white/25"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
