import { motion, AnimatePresence } from "framer-motion";
import { Timer, Check } from "lucide-react";
import { useChatDisappear } from "@/hooks/useChatActions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
}

const OPTIONS: { label: string; value: number | null }[] = [
  { label: "Off", value: null },
  { label: "30 seconds", value: 30 },
  { label: "5 minutes", value: 60 * 5 },
  { label: "1 hour", value: 60 * 60 },
  { label: "24 hours", value: 60 * 60 * 24 },
  { label: "7 days", value: 60 * 60 * 24 * 7 },
];

export function DisappearingMessagesDialog({ open, onClose, chatId }: Props) {
  const { seconds, setDisappear } = useChatDisappear(chatId);

  const choose = async (value: number | null) => {
    const { error } = await setDisappear(value);
    if (error) return toast.error(error.message);
    toast.success(value ? "Disappearing messages on" : "Disappearing messages off");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto glass-panel rounded-3xl p-5 border border-glass-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/15 text-neon flex items-center justify-center">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Disappearing messages</h3>
                <p className="text-xs text-muted-foreground">Auto-delete after a chosen time. Applies to new messages only.</p>
              </div>
            </div>
            <div className="space-y-1">
              {OPTIONS.map(opt => {
                const active = (opt.value ?? null) === (seconds ?? null);
                return (
                  <button key={opt.label} onClick={() => choose(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm transition-colors ${active ? "bg-primary/15 text-foreground" : "hover:bg-secondary/60"}`}>
                    <span>{opt.label}</span>
                    {active && <Check className="h-4 w-4 text-neon" />}
                  </button>
                );
              })}
            </div>
            <button onClick={onClose} className="mt-4 w-full h-10 rounded-xl bg-secondary text-sm">Close</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
