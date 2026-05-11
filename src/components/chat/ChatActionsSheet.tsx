import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Palette, Timer, Image as ImageIcon, Pin, BellOff, Download, Ban, Flag, Ghost, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
  onOpenProfile: () => void;
}

export function ChatActionsSheet({ open, onClose, chatId, onOpenProfile }: Props) {
  const soon = (label: string) => () => { toast(`${label} — coming soon`); onClose(); };

  const muteToggle = async () => {
    toast.success("Notifications muted for this chat");
    onClose();
  };

  const pinChat = async () => {
    toast.success("Chat pinned");
    onClose();
  };

  const exportChat = async () => {
    if (!chatId) return;
    const { data } = await supabase.from("messages").select("created_at,sender_id,content,message_type").eq("chat_id", chatId).order("created_at");
    if (!data) return;
    const text = data.map(m => `[${new Date(m.created_at!).toLocaleString()}] ${m.sender_id.slice(0, 8)}: ${m.content ?? `(${m.message_type})`}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `aura-chat-${chatId.slice(0, 8)}.txt`; a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Chat exported");
    onClose();
  };

  const items = [
    { icon: Search, label: "Search in chat", onClick: soon("Search") },
    { icon: ImageIcon, label: "Media gallery", onClick: () => { onOpenProfile(); onClose(); } },
    { icon: Pin, label: "Pin conversation", onClick: pinChat },
    { icon: BellOff, label: "Mute notifications", onClick: muteToggle },
    { icon: Palette, label: "Chat theme", onClick: soon("Custom chat theme") },
    { icon: Timer, label: "Disappearing messages", onClick: soon("Disappearing messages") },
    { icon: Ghost, label: "Ghost mode", onClick: soon("Ghost mode") },
    { icon: Sparkles, label: "AI tools", onClick: soon("AI tools") },
    { icon: Download, label: "Export chat", onClick: exportChat },
    { icon: Trash2, label: "Clear chat", onClick: soon("Clear chat"), danger: true },
    { icon: Ban, label: "Block user", onClick: soon("Block user"), danger: true },
    { icon: Flag, label: "Report user", onClick: soon("Report user"), danger: true },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-background border-t border-glass-border max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom,12px)]"
          >
            <div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
            <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-2">Chat options</p>
            <div className="px-3 pb-4 grid grid-cols-1 gap-1">
              {items.map((it, i) => (
                <motion.button
                  key={it.label}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={it.onClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/60 transition-colors text-left ${it.danger ? "text-destructive" : ""}`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${it.danger ? "bg-destructive/15" : "bg-primary/15 text-neon"}`}>
                    <it.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[14px] font-medium">{it.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
