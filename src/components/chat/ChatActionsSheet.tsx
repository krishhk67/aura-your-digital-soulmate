import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Image as ImageIcon, Pin, PinOff, Bell, BellOff, Download, Ban, Flag, Users, Timer, Palette, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChatMemberState, useBlockUser, clearChatForMe } from "@/hooks/useChatActions";
import { useHiddenSpace } from "@/hooks/useHiddenSpace";
import { ConfirmDialog } from "./ConfirmDialog";
import { ReportDialog } from "./ReportDialog";
import { DisappearingMessagesDialog } from "./DisappearingMessagesDialog";
import { ChatThemeDialog } from "./ChatThemeDialog";
import { HiddenSpaceSetupDialog } from "./HiddenSpaceSetupDialog";


interface Props {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
  partnerId?: string | null;
  isGroup?: boolean;
  onOpenProfile: () => void;
  onSearch: () => void;
}

export function ChatActionsSheet({ open, onClose, chatId, partnerId, isGroup, onOpenProfile, onSearch }: Props) {
  const { user } = useAuth();
  const { is_pinned, is_muted, update } = useChatMemberState(chatId);
  const { block } = useBlockUser();
  const hs = useHiddenSpace();
  const [confirm, setConfirm] = useState<null | "clear" | "block">(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [disappearOpen, setDisappearOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [hsSetupOpen, setHsSetupOpen] = useState(false);
  const isHidden = chatId ? hs.isHidden(chatId) : false;



  const togglePin = async () => {
    const { error } = await update({ is_pinned: !is_pinned });
    if (error) return toast.error(error.message);
    toast.success(is_pinned ? "Unpinned" : "Pinned to top");
    onClose();
  };

  const toggleMute = async () => {
    const { error } = await update({ is_muted: !is_muted });
    if (error) return toast.error(error.message);
    toast.success(is_muted ? "Notifications on" : "Muted");
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

  const doClear = async () => {
    if (!chatId || !user) return;
    const { error } = await clearChatForMe(chatId, user.id);
    if (error) return toast.error(error.message);
    toast.success("Chat cleared from your view");
    onClose();
  };

  const doBlock = async () => {
    if (!partnerId) return;
    const { error } = await block(partnerId);
    if (error) return toast.error(error.message);
    toast.success("User blocked");
    onClose();
  };

  const items = [
    { icon: Search, label: "Search in chat", onClick: () => { onSearch(); onClose(); } },
    { icon: ImageIcon, label: "Media gallery", onClick: () => { onOpenProfile(); onClose(); } },
    { icon: is_pinned ? PinOff : Pin, label: is_pinned ? "Unpin conversation" : "Pin conversation", onClick: togglePin },
    { icon: is_muted ? Bell : BellOff, label: is_muted ? "Unmute notifications" : "Mute notifications", onClick: toggleMute },
    { icon: Timer, label: "Disappearing messages", onClick: () => { setDisappearOpen(true); onClose(); } },
    { icon: Palette, label: "Chat theme", onClick: () => { setThemeOpen(true); onClose(); } },
    {
      icon: isHidden ? Eye : EyeOff,
      label: isHidden ? "Remove from Hidden Space" : "Move to Hidden Space",
      onClick: async () => {
        if (!chatId) return;
        if (!hs.configured) {
          setHsSetupOpen(true); onClose();
          toast("Set up Hidden Space first", { description: "Choose your secret keyword to activate." });
          return;
        }
        const { error } = isHidden ? await hs.moveChatOut(chatId) : await hs.moveChatIn(chatId);
        if (error) return toast.error(error.message);
        toast.success(isHidden ? "Moved out of Hidden Space" : "Moved to Hidden Space");
        onClose();
      },
    },
    { icon: Download, label: "Export chat", onClick: exportChat },
    { icon: Trash2, label: "Clear chat", onClick: () => setConfirm("clear"), danger: true },
    ...(!isGroup && partnerId ? [
      { icon: Ban, label: "Block user", onClick: () => setConfirm("block"), danger: true },
      { icon: Flag, label: "Report user", onClick: () => { setReportOpen(true); }, danger: true },
    ] : []),
    ...(isGroup ? [{ icon: Users, label: "View members", onClick: () => { onOpenProfile(); onClose(); } }] : []),
  ];


  return (
    <>
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

      <ConfirmDialog
        open={confirm === "clear"} onClose={() => setConfirm(null)}
        title="Clear this chat?"
        description="Messages will be hidden from your view. The other person will still see them."
        confirmLabel="Clear" destructive onConfirm={doClear}
      />
      <ConfirmDialog
        open={confirm === "block"} onClose={() => setConfirm(null)}
        title="Block this user?"
        description="They won't be able to message you. You can unblock them later in Settings."
        confirmLabel="Block" destructive onConfirm={doBlock}
      />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} reportedUserId={partnerId ?? null} chatId={chatId} />
      <DisappearingMessagesDialog open={disappearOpen} onClose={() => setDisappearOpen(false)} chatId={chatId} />
      <ChatThemeDialog open={themeOpen} onClose={() => setThemeOpen(false)} chatId={chatId} />
      <HiddenSpaceSetupDialog open={hsSetupOpen} onClose={() => setHsSetupOpen(false)} />
    </>
  );
}

