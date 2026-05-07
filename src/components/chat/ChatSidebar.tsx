import { motion } from "framer-motion";
import {
  MessageCircle,
  Search,
  Plus,
  Settings,
  Pin,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

const mockChats = [
  { id: "1", name: "Luna K.", lastMsg: "that's literally so fire 🔥", time: "2m", unread: 3, online: true, avatar: "🌙" },
  { id: "2", name: "Dev Squad", lastMsg: "pushed the fix, check it out", time: "15m", unread: 0, online: false, avatar: "⚡", isGroup: true },
  { id: "3", name: "Mia Chen", lastMsg: "sent a voice note 🎤", time: "1h", unread: 1, online: true, avatar: "🎭" },
  { id: "4", name: "Anime Room", lastMsg: "Chainsaw Man ep 12 was insane", time: "3h", unread: 0, online: false, avatar: "🌸", isGroup: true },
  { id: "5", name: "Kai Nakamura", lastMsg: "wanna hop on a call?", time: "5h", unread: 0, online: false, avatar: "🎮" },
  { id: "6", name: "Midnight Talks", lastMsg: "can't sleep either huh", time: "8h", unread: 12, online: false, avatar: "🌃", isGroup: true },
];

interface ChatSidebarProps {
  selectedChat: string | null;
  onSelectChat: (id: string) => void;
}

export function ChatSidebar({ selectedChat, onSelectChat }: ChatSidebarProps) {
  return (
    <div className="h-full flex flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-neon" />
          <span className="font-display font-bold text-xl gradient-text">Aura</span>
        </Link>
        <div className="flex items-center gap-1">
          <button className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Plus className="h-5 w-5" />
          </button>
          <button className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full h-10 rounded-xl bg-input/50 border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-3 flex gap-2">
        {["All", "Unread", "Groups"].map((filter) => (
          <button
            key={filter}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "All"
                ? "bg-primary/15 text-neon"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {mockChats.map((chat) => (
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
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-xl">
                {chat.avatar}
              </div>
              {chat.online && (
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-accent border-2 border-surface" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{chat.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{chat.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMsg}</p>
            </div>

            {/* Unread badge */}
            {chat.unread > 0 && (
              <div className="h-5 min-w-[20px] rounded-full bg-primary flex items-center justify-center px-1.5">
                <span className="text-[10px] font-bold text-primary-foreground">{chat.unread}</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Bottom profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-primary-foreground">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Anon User</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
