import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive, onConfirm, onClose }: Props) {
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
            <div className="flex items-start gap-3 mb-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${destructive ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-neon"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80">{cancelLabel}</button>
              <button onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold ${destructive ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"} hover:opacity-90`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
