import { motion } from "framer-motion";
import { MessageCircle, Search, Plus, UserPlus, Pin, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyChats } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { useUsersWithActiveStories } from "@/hooks/useStories";
import { useHiddenSpace } from "@/hooks/useHiddenSpace";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface ChatSidebarProps {
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function ChatSidebar({ selectedChat, onSelectChat, onNewChat }: ChatSidebarProps) {
  const { chats, loading } = useMyChats();
  const { user } = useAuth();
  const storyUsers = useUsersWithActiveStories();
  const hs = useHiddenSpace();
  const [searchQuery, setSearchQuery] = useState("");

  // Intercept search: if it matches the hidden-space keyword, unlock and clear.
  const onSearchChange = async (v: string) => {
    setSearchQuery(v);
    if (hs.configured && v.trim().length >= 3) {
      const ok = await hs.unlock(v.trim());
      if (ok) setSearchQuery("");
    }
  };

  const filteredChats = searchQuery
    ? chats.filter(c => {
        const name = c.is_group ? c.name : c.other_user?.display_name ?? c.other_user?.username;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : chats;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-[env(safe-area-inset-top,12px)] pb-2">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-neon" />
            <span className="font-display font-bold text-2xl gradient-text">Aura</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onNewChat}
            className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-neon hover:bg-primary/30 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-2xl bg-secondary/50 border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-5 border border-primary/10">
              <MessageCircle className="h-10 w-10 text-neon" />
            </div>
            <p className="font-display font-semibold text-lg mb-2">Start Chatting</p>
            <p className="text-sm text-muted-foreground mb-5">Find people and start your first conversation on Aura</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onNewChat}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_var(--neon-glow)] transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Find People
            </motion.button>
          </div>
        ) : (
          filteredChats.map((chat, index) => {
            const displayName = chat.is_group ? chat.name : (chat.other_user?.display_name ?? chat.other_user?.username ?? "User");
            const avatar = chat.is_group ? (chat.avatar_url || null) : (chat.other_user?.avatar_url || null);
            const isOnline = !chat.is_group && chat.other_user?.is_online;
            const lastMsg = chat.last_message?.content ?? "No messages yet";
            const timeAgo = chat.last_message?.created_at
              ? formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: false })
              : "";
            const isSelected = selectedChat === chat.id;

            return (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all text-left active:bg-secondary/80",
                  isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/40"
                )}
              >
                <div className="relative flex-shrink-0">
                  {(() => {
                    const hasStory = !chat.is_group && chat.other_user && storyUsers.has(chat.other_user.id);
                    const innerImg = avatar?.startsWith("http") ? (
                      <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg font-bold">
                        {chat.is_group ? "👥" : displayName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    );
                    return hasStory ? (
                      <div className="h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary">
                        <div className="h-full w-full rounded-full bg-background p-[2px]">
                          <div className="h-full w-full rounded-full overflow-hidden">{innerImg}</div>
                        </div>
                      </div>
                    ) : <div className="h-14 w-14">{innerImg}</div>;
                  })()}
                  {isOnline && (
                    <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-accent border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-[15px] truncate flex items-center gap-1.5">
                      {chat.is_pinned && <Pin className="h-3 w-3 text-neon flex-shrink-0" />}
                      {displayName}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2 flex items-center gap-1">
                      {chat.is_muted && <BellOff className="h-3 w-3" />}
                      {timeAgo}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground truncate">{lastMsg}</p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
