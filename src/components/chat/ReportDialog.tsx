import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";
import { useReportUser } from "@/hooks/useChatActions";

const REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Hate speech",
  "Inappropriate content",
  "Impersonation",
  "Other",
];

interface Props {
  open: boolean;
  onClose: () => void;
  reportedUserId: string | null;
  chatId: string | null;
}

export function ReportDialog({ open, onClose, reportedUserId, chatId }: Props) {
  const report = useReportUser();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reportedUserId) return;
    setSubmitting(true);
    const { error } = await report({ reportedUserId, chatId, reason, details: details.trim() || undefined });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Our team will review it.");
    setDetails("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed inset-x-3 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto glass-panel rounded-3xl p-5 border border-glass-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-destructive/15 flex items-center justify-center"><Flag className="h-4 w-4 text-destructive" /></div>
                <h3 className="font-semibold">Report user</h3>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Pick the closest reason. Add details if you can.</p>
            <div className="space-y-1.5 mb-3">
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${reason === r ? "bg-primary/15 border border-primary/30 text-foreground" : "bg-secondary/40 border border-transparent hover:bg-secondary"}`}>
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={details} onChange={e => setDetails(e.target.value)}
              placeholder="Optional details…" rows={3}
              className="w-full rounded-xl bg-secondary/50 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 mb-4 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80">Cancel</button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
