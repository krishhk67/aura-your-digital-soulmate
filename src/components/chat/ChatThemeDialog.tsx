import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { THEMES, type ThemeId } from "@/hooks/useTheme";
import { useChatMemberState } from "@/hooks/useChatActions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
}

export function ChatThemeDialog({ open, onClose, chatId }: Props) {
  const { theme, update } = useChatMemberState(chatId);

  const choose = async (id: ThemeId | null) => {
    const { error } = await update({ theme: id });
    if (error) return toast.error(error.message);
    toast.success(id ? "Chat theme updated" : "Using default theme");
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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto glass-panel rounded-3xl p-5 border border-glass-border max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/15 text-neon flex items-center justify-center">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Chat theme</h3>
                <p className="text-xs text-muted-foreground">A theme just for this conversation. Only you see it.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => choose(null)}
                className={`p-3 rounded-2xl border text-left transition-all ${!theme ? "border-primary shadow-[0_0_20px_var(--neon-glow)]" : "border-border hover:border-muted-foreground"}`}>
                <div className="h-14 w-full rounded-xl mb-2 bg-secondary flex items-center justify-center text-xs text-muted-foreground">Default</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Use app theme</p>
                  {!theme && <Check className="h-3 w-3 text-neon" />}
                </div>
              </button>
              {THEMES.map(t => {
                const active = theme === t.id;
                return (
                  <button key={t.id} onClick={() => choose(t.id)}
                    className={`p-3 rounded-2xl border text-left transition-all overflow-hidden ${active ? "border-primary shadow-[0_0_20px_var(--neon-glow)]" : "border-border hover:border-muted-foreground"}`}>
                    <div className="h-14 w-full rounded-xl mb-2 relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${t.bg} 0%, ${t.accent} 140%)` }}>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 30%, ${t.accent} 0%, transparent 60%)`, opacity: 0.7 }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold truncate">{t.label}</p>
                      {active && <Check className="h-3 w-3 text-neon flex-shrink-0" />}
                    </div>
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
