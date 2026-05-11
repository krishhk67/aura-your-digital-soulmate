import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Image as ImageIcon, Shield, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { ProfileRow } from "@/hooks/useRealtimeChat";

interface Props {
  open: boolean;
  onClose: () => void;
  partner: ProfileRow | null;
  chatId: string | null;
}

export function ChatProfileSheet({ open, onClose, partner, chatId }: Props) {
  const [media, setMedia] = useState<{ url: string; type: string }[]>([]);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    if (!open || !chatId) return;
    (async () => {
      const { data: msgs, count } = await supabase
        .from("messages")
        .select("media_url,message_type", { count: "exact" })
        .eq("chat_id", chatId)
        .not("media_url", "is", null)
        .in("message_type", ["image", "video"])
        .order("created_at", { ascending: false })
        .limit(9);
      setMedia((msgs ?? []).filter(m => m.media_url).map(m => ({ url: m.media_url as string, type: m.message_type })));
      const { count: total } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("chat_id", chatId);
      setMsgCount(total ?? 0);
    })();
  }, [open, chatId]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 top-12 z-50 rounded-t-3xl bg-background border-t border-glass-border overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
              <h2 className="font-display font-semibold">Profile</h2>
              <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pt-6 pb-4 text-center">
              {partner?.avatar_url ? (
                <img src={partner.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover mx-auto ring-2 ring-primary/40" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-3xl font-bold mx-auto">
                  {partner?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <h3 className="mt-3 font-display font-bold text-xl">{partner?.display_name ?? "Unknown"}</h3>
              {partner?.username && <p className="text-sm text-muted-foreground">@{partner.username}</p>}
              {partner?.status_text && <p className="mt-2 text-sm text-foreground/80 italic">"{partner.status_text}"</p>}
            </div>

            {partner?.bio && (
              <div className="mx-4 mb-4 p-4 glass-panel rounded-2xl">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Bio</p>
                <p className="text-sm">{partner.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mx-4 mb-4">
              <Stat icon={<MessageSquare className="h-4 w-4" />} label="Messages" value={msgCount.toString()} />
              <Stat icon={<ImageIcon className="h-4 w-4" />} label="Media" value={media.length.toString()} />
              <Stat icon={<Shield className="h-4 w-4" />} label="Status" value={partner?.is_online ? "Online" : "Away"} />
            </div>

            {partner?.created_at && (
              <div className="mx-4 mb-4 p-4 glass-panel rounded-2xl text-sm">
                <span className="text-muted-foreground">Joined </span>
                <span className="font-medium">{format(new Date(partner.created_at), "MMM d, yyyy")}</span>
              </div>
            )}

            <div className="mx-4 mb-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Shared Media</p>
              {media.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center glass-panel rounded-2xl">No media yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {media.map((m, i) => (
                    <a key={i} href={m.url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-secondary">
                      {m.type === "video" ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl p-3 text-center">
      <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-1 text-neon">{icon}</div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
