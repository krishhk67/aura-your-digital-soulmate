import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Paperclip, Mic, Phone, Video, MoreVertical, Sparkles, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatMessages, useSendMessage } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow } from "@/hooks/useRealtimeChat";

interface ChatWindowProps {
  chatId: string | null;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { messages, loading } = useChatMessages(chatId);
  const sendMessage = useSendMessage();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [chatPartner, setChatPartner] = useState<ProfileRow | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chat partner info for header
  useEffect(() => {
    if (!chatId || !user) return;
    (async () => {
      const { data: members } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId)
        .neq("user_id", user.id);
      if (members?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", members[0].user_id)
          .single();
        if (profile) setChatPartner(profile as ProfileRow);
      }
    })();
  }, [chatId, user]);

  const handleSend = async () => {
    if (!input.trim() || !chatId) return;
    const text = input;
    setInput("");
    await sendMessage(chatId, text);
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-5 border border-primary/10">
            <Sparkles className="h-10 w-10 text-neon animate-pulse-neon" />
          </div>
          <h2 className="font-display text-xl font-semibold gradient-text mb-2">Welcome to Aura</h2>
          <p className="text-sm text-muted-foreground">Select a conversation from the sidebar or find new people to chat with.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border glass-panel rounded-none flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {chatPartner?.avatar_url ? (
              <img src={chatPartner.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                {chatPartner?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            {chatPartner?.is_online && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-accent border-2 border-surface" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm">{chatPartner?.display_name ?? "Loading..."}</h3>
              {chatPartner?.username && <span className="text-[10px] text-neon">@{chatPartner.username}</span>}
            </div>
            <p className="text-xs text-accent">
              {chatPartner?.is_online ? "online" : chatPartner?.last_seen ? `last seen ${formatDistanceToNow(new Date(chatPartner.last_seen), { addSuffix: true })}` : "offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[Phone, Video, MoreVertical].map((Icon, i) => (
            <button key={i} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div className="relative max-w-[75%] group">
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isMe
                      ? "bg-primary/20 text-foreground rounded-br-md border border-primary/20"
                      : "glass-panel text-foreground rounded-bl-md"
                  )}>
                    {!isMe && msg.sender && (
                      <p className="text-[10px] text-neon mb-1 font-medium">{msg.sender.display_name}</p>
                    )}
                    {msg.content}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground",
                    isMe ? "justify-end" : "justify-start"
                  )}>
                    <span>{time}</span>
                    {isMe && <CheckCheck className="h-3 w-3 text-accent" />}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full rounded-2xl bg-input/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            />
          </div>
          <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
            <Smile className="h-5 w-5" />
          </button>
          {input.trim() ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleSend}
              className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:shadow-[0_0_20px_var(--neon-glow)] transition-all flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          ) : (
            <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-neon flex-shrink-0">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
