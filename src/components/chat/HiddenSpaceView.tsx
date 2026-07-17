import { motion, AnimatePresence } from "framer-motion";
import { EyeOff, Lock, Plus, Search, ShieldCheck } from "lucide-react";
import { useMyChats } from "@/hooks/useRealtimeChat";
import { useHiddenSpace } from "@/hooks/useHiddenSpace";
import { ChatWindow } from "./ChatWindow";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Props { onClose: () => void }

export function HiddenSpaceView({ onClose }: Props) {
  const { chats, loading } = useMyChats({ hiddenOnly: true });
  const { lock, settings, bumpActivity } = useHiddenSpace();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = query
    ? chats.filter(c => {
        const n = c.is_group ? c.name : c.other_user?.display_name ?? c.other_user?.username;
        return n?.toLowerCase().includes(query.toLowerCase());
      })
    : chats;

  const wallpaper = settings?.wallpaper_url;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(20px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(20px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onPointerDown={bumpActivity}
      onKeyDown={bumpActivity}
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden"
      style={{
        background: wallpaper
          ? `linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.95)), url(${wallpaper}) center/cover`
          : "radial-gradient(ellipse at top, #0a0a1a 0%, #000 60%), #000",
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-purple-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-blue-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.15),transparent_60%)]" />

      {selected ? (
        <div className="relative z-10 h-full">
          <ChatWindow key={selected} chatId={selected} onBack={() => setSelected(null)} />
        </div>
      ) : (
        <>
          <div className="relative z-10 px-5 pt-[env(safe-area-inset-top,16px)] pb-3">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={{ boxShadow: ["0 0 20px rgba(139,92,246,.4)", "0 0 40px rgba(139,92,246,.7)", "0 0 20px rgba(139,92,246,.4)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center border border-white/10 backdrop-blur-xl"
                >
                  <EyeOff className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <p className="font-display font-bold text-lg text-white tracking-wide">Hidden Space</p>
                  <p className="text-[10px] text-purple-300/70 uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" /> Private Vault
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { lock(); onClose(); }}
                className="h-10 w-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center text-white/80 hover:bg-white/10 transition"
                title="Lock"
              >
                <Lock className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hidden chats..."
                className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
              />
            </div>
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto px-3 pb-6 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 px-6">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="h-24 w-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 backdrop-blur-xl flex items-center justify-center mx-auto mb-5"
                >
                  <EyeOff className="h-10 w-10 text-purple-300" />
                </motion.div>
                <p className="font-display font-semibold text-lg text-white mb-2">Your vault is empty</p>
                <p className="text-sm text-white/50 max-w-xs mx-auto">
                  Move any chat here from its options menu. Hidden chats never appear in your main list.
                </p>
              </div>
            ) : filtered.map((chat, i) => {
              const displayName = chat.is_group ? chat.name : (chat.other_user?.display_name ?? chat.other_user?.username ?? "User");
              const avatar = chat.is_group ? chat.avatar_url : chat.other_user?.avatar_url;
              const last = chat.last_message?.content ?? "No messages yet";
              const time = chat.last_message?.created_at
                ? formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: false })
                : "";
              return (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelected(chat.id)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 backdrop-blur-xl transition"
                >
                  <div className="h-14 w-14 flex-shrink-0">
                    {avatar?.startsWith("http") ? (
                      <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-lg font-bold text-white">
                        {chat.is_group ? "👥" : displayName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[15px] truncate text-white">{displayName}</span>
                      <span className="text-[11px] text-white/40 flex-shrink-0 ml-2">{time}</span>
                    </div>
                    <p className="text-[13px] text-white/50 truncate">{last}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
