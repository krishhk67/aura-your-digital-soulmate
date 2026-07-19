import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Search, Plus, UserPlus, Pin, BellOff,
  Users, User, Mail, Star, Archive, PhoneCall, Sparkles, Lock, Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyChats } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { useAllStoryGroups } from "@/hooks/useAllStoryGroups";
import { SmartAvatarButton } from "./SmartAvatarButton";
import { useHiddenSpace } from "@/hooks/useHiddenSpace";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";

interface ChatSidebarProps {
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

type FilterKey =
  | "all" | "chats" | "groups" | "unread" | "favorites"
  | "archived" | "calls" | "ai" | "hidden" | "communities";

interface FilterDef {
  key: FilterKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresHidden?: boolean;
}

const FILTERS: FilterDef[] = [
  { key: "all", label: "All", icon: Globe2 },
  { key: "chats", label: "Chats", icon: User },
  { key: "groups", label: "Groups", icon: Users },
  { key: "unread", label: "Unread", icon: Mail },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "archived", label: "Archived", icon: Archive },
  { key: "calls", label: "Calls", icon: PhoneCall },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "hidden", label: "Hidden", icon: Lock, requiresHidden: true },
  { key: "communities", label: "Communities", icon: MessageCircle },
];

export function ChatSidebar({ selectedChat, onSelectChat, onNewChat }: ChatSidebarProps) {
  const { chats: normalChats, loading, markChatRead } = useMyChats();
  const hs = useHiddenSpace();
  const { chats: hiddenChats, markChatRead: markHiddenRead } = useMyChats({ hiddenOnly: hs.unlocked });

  const openChat = (id: string) => {
    // Optimistically clear the unread indicator the moment the user taps a row.
    markChatRead(id);
    markHiddenRead(id);
    onSelectChat(id);
  };

  const { user } = useAuth();
  const storyGroups = useAllStoryGroups();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [callChatIds, setCallChatIds] = useState<Set<string>>(new Set());

  // Fetch chat_ids with recent calls (last 30d)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("calls")
        .select("chat_id")
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gte("created_at", since);
      if (cancelled) return;
      const ids = new Set<string>();
      (data ?? []).forEach((r) => { if (r.chat_id) ids.add(r.chat_id); });
      setCallChatIds(ids);
    })();
    const ch = supabase
      .channel(`sidebar-calls:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => {
        // refetch lightweight
        setCallChatIds((prev) => new Set(prev));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  // Intercept search: hidden-space keyword
  const onSearchChange = async (v: string) => {
    setSearchQuery(v);
    if (hs.configured && v.trim().length >= 3) {
      const ok = await hs.unlock(v.trim());
      if (ok) setSearchQuery("");
    }
  };

  const source = activeFilter === "hidden" ? hiddenChats : normalChats;

  const filteredChats = useMemo(() => {
    let list = source;

    switch (activeFilter) {
      case "all":
        list = list.filter((c) => !c.is_archived);
        break;
      case "chats":
        list = list.filter((c) => !c.is_group && !c.is_archived);
        break;
      case "groups":
        list = list.filter((c) => c.is_group && !c.is_archived);
        break;
      case "unread":
        list = list.filter((c) => (c.unread_count ?? 0) > 0 && !c.is_archived);
        break;
      case "favorites":
        list = list.filter((c) => c.is_favorite && !c.is_archived);
        break;
      case "archived":
        list = list.filter((c) => c.is_archived);
        break;
      case "calls":
        list = list.filter((c) => callChatIds.has(c.id) && !c.is_archived);
        break;
      case "ai":
      case "communities":
        list = [];
        break;
      case "hidden":
        // already hidden set
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const name = c.is_group ? c.name : c.other_user?.display_name ?? c.other_user?.username;
        return name?.toLowerCase().includes(q);
      });
    }
    return list;
  }, [source, activeFilter, searchQuery, callChatIds]);

  // Badge counters — SINGLE source of truth: a chat contributes only if it
  // has unread messages from OTHER users (unread_count > 0), i.e. the same
  // condition that renders the purple dot in the conversation row.
  const counts = useMemo(() => {
    const active = normalChats.filter((c) => !c.is_archived);
    const unreadActive = active.filter((c) => (c.unread_count ?? 0) > 0);
    const unreadHidden = hiddenChats.filter((c) => (c.unread_count ?? 0) > 0);
    return {
      unread: unreadActive.length,
      groups: unreadActive.filter((c) => c.is_group).length,
      chats: unreadActive.filter((c) => !c.is_group).length,
      favorites: unreadActive.filter((c) => c.is_favorite).length,
      archived: normalChats.filter((c) => c.is_archived && (c.unread_count ?? 0) > 0).length,
      calls: unreadActive.filter((c) => callChatIds.has(c.id)).length,
      hidden: unreadHidden.length,
    } as Record<string, number>;
  }, [normalChats, hiddenChats, callChatIds]);


  const visibleFilters = FILTERS.filter((f) => !f.requiresHidden || hs.unlocked);

  const emptyMessage = () => {
    switch (activeFilter) {
      case "unread": return "No unread chats.";
      case "favorites": return "No favorite conversations.";
      case "groups": return "No group chats yet.";
      case "chats": return "No one-to-one chats yet.";
      case "archived": return "Nothing archived.";
      case "calls": return "No recent calls.";
      case "ai": return "AI conversations coming soon.";
      case "communities": return "Communities are coming soon.";
      case "hidden": return "No hidden conversations.";
      default: return "Start Chatting";
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-[env(safe-area-inset-top,12px)] pb-2">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-neon" />
            <span className="font-display font-bold text-2xl gradient-text">Aurix</span>
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 rounded-2xl bg-secondary/50 border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Filter chips */}
        <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 py-1.5 pr-2 w-max">
            {visibleFilters.map((f) => {
              const selected = activeFilter === f.key;
              const badge = counts[f.key] ?? 0;
              const Icon = f.icon;
              return (
                <motion.button
                  key={f.key}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveFilter(f.key)}
                  className={cn(
                    "relative flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors duration-200",
                    // extend tap target to ~44px without altering visual size
                    "before:content-[''] before:absolute before:inset-x-0 before:-inset-y-[9px]",
                    selected
                      ? "bg-primary text-primary-foreground border border-primary/80 shadow-[0_0_8px_-1px_var(--neon-glow),inset_0_1px_0_0_rgb(255_255_255_/_0.15),inset_0_-1px_2px_0_rgb(0_0_0_/_0.25)]"
                      : "bg-transparent text-muted-foreground/80 border border-border/70 hover:text-foreground hover:bg-secondary/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{f.label}</span>
                  {badge > 0 && f.key !== "all" && (
                    <span className={cn(
                      "ml-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full text-[9.5px] font-semibold leading-none flex items-center justify-center",
                      selected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-neon"
                    )}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
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
            <p className="font-display font-semibold text-lg mb-2">{emptyMessage()}</p>
            {activeFilter === "all" && (
              <>
                <p className="text-sm text-muted-foreground mb-5">Find people and start your first conversation on Aurix</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onNewChat}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_var(--neon-glow)] transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Find People
                </motion.button>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredChats.map((chat, index) => {
              const displayName = (chat.is_group ? chat.name : (chat.other_user?.display_name ?? chat.other_user?.username)) ?? "User";
              const avatar = chat.is_group ? (chat.avatar_url || null) : (chat.other_user?.avatar_url || null);
              const isOnline = !chat.is_group && chat.other_user?.is_online;
              const lm = chat.last_message;
              const lmType = lm?.message_type;
              const lmMeta = (lm?.metadata ?? null) as { reaction?: string } | null;
              const lastMsg = !lm
                ? "No messages yet"
                : lmType === "story_reaction"
                ? `${lmMeta?.reaction ?? "❤️"} Reacted to your story`
                : lmType === "story_reply"
                ? `↪ Replied to your story${lm.content ? `: ${lm.content}` : ""}`
                : lmType === "image" ? "📷 Photo"
                : lmType === "video" ? "🎥 Video"
                : lmType === "audio" ? "🎙 Voice message"
                : lmType === "file" ? "📎 File"
                : (lm.content ?? "");
              const timeAgo = chat.last_message?.created_at
                ? formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: false })
                : "";
              const isSelected = selectedChat === chat.id;

              return (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.15) }}
                  className={cn(
                    "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all text-left",
                    isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/40"
                  )}
                >
                  <SmartAvatarButton
                    chat={chat}
                    displayName={displayName}
                    avatarUrl={avatar}
                    isOnline={!!isOnline}
                    otherUser={chat.is_group ? null : (chat.other_user ?? null)}
                    storyGroup={chat.is_group ? undefined : (chat.other_user ? storyGroups.get(chat.other_user.id) : undefined)}
                    onOpenChat={() => openChat(chat.id)}
                  />
                  <button
                    onClick={() => openChat(chat.id)}

                    className="flex-1 min-w-0 text-left active:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        "truncate flex items-center gap-1.5 text-[15px]",
                        (chat.unread_count ?? 0) > 0 ? "font-bold text-foreground" : "font-semibold"
                      )}>
                        {chat.is_pinned && <Pin className="h-3 w-3 text-neon flex-shrink-0" />}
                        {chat.is_favorite && <Star className="h-3 w-3 text-neon flex-shrink-0 fill-current" />}
                        {displayName}
                      </span>
                      <span className={cn(
                        "text-[11px] flex-shrink-0 ml-2 flex items-center gap-1",
                        (chat.unread_count ?? 0) > 0 ? "text-neon font-semibold" : "text-muted-foreground"
                      )}>
                        {chat.is_muted && <BellOff className="h-3 w-3" />}
                        {timeAgo}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-[13px] truncate",
                        (chat.unread_count ?? 0) > 0 ? "text-foreground/90 font-medium" : "text-muted-foreground"
                      )}>{lastMsg}</p>
                      {(chat.unread_count ?? 0) > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-[0_0_10px_var(--neon-glow)] flex-shrink-0">
                          {(chat.unread_count ?? 0) > 99 ? "99+" : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
