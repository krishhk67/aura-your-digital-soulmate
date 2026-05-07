import { motion } from "framer-motion";
import { MessageCircle, Search, Plus, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useMyChats } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow } from "@/hooks/useRealtimeChat";

interface ChatSidebarProps {
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ selectedChat, onSelectChat, onNewChat }: ChatSidebarProps) {
  const { chats, loading } = useMyChats();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile(data as ProfileRow);
    });
  }, [user]);

  const filteredChats = searchQuery
    ? chats.filter(c => {
        const name = c.is_group ? c.name : c.other_user?.display_name ?? c.other_user?.username;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : chats;

  return (
    <div className="h-full flex flex-col border-r border-border bg-surface">
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-neon" />
          <span className="font-display font-bold text-xl gradient-text">Aura</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Plus className="h-5 w-5" />
          </button>
          <button onClick={signOut} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-xl bg-input/50 border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No chats yet</p>
            <p className="text-xs text-muted-foreground mt-1">Tap + to start a conversation</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const displayName = chat.is_group ? chat.name : (chat.other_user?.display_name ?? chat.other_user?.username ?? "User");
            const avatar = chat.is_group ? (chat.avatar_url || "👥") : (chat.other_user?.avatar_url || null);
            const isOnline = !chat.is_group && chat.other_user?.is_online;
            const lastMsg = chat.last_message?.content ?? "No messages yet";
            const timeAgo = chat.last_message?.created_at
              ? formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: false })
              : "";

            return (
              <motion.button
                key={chat.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                  selectedChat === chat.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-secondary/50"
                )}
              >
                <div className="relative flex-shrink-0">
                  {avatar && avatar.startsWith("http") ? (
                    <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-xl">
                      {avatar || displayName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-accent border-2 border-surface" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{displayName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg}</p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-primary-foreground">
              {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.display_name ?? "Loading..."}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
