import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Paperclip, ArrowLeft, Phone, Video, MoreVertical, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatMessages, useSendMessage } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow } from "@/hooks/useRealtimeChat";
import { toast } from "sonner";

interface ChatWindowProps {
  chatId: string | null;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const { messages, loading } = useChatMessages(chatId);
  const sendMessage = useSendMessage();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [chatPartner, setChatPartner] = useState<ProfileRow | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !user) return;
    setChatPartner(null);
    window.setTimeout(() => inputRef.current?.focus(), 250);
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

      // Mark as read
      await supabase.from("chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("chat_id", chatId)
        .eq("user_id", user.id);
    })();
  }, [chatId, user]);

  const handleSend = async () => {
    if (!input.trim() || !chatId) return;
    const text = input;
    setInput("");
    const { error } = await sendMessage(chatId, text);
    if (error) {
      setInput(text);
      toast.error(error.message);
    }
    inputRef.current?.focus();
  };

  if (!chatId) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border glass-panel rounded-none flex-shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}
      >
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {chatPartner?.avatar_url ? (
              <img src={chatPartner.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">
                {chatPartner?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            {chatPartner?.is_online && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border-2 border-background" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{chatPartner?.display_name ?? "Loading..."}</h3>
            <p className="text-[11px] text-accent">
              {chatPartner?.is_online ? "online" : chatPartner?.last_seen ? `last seen ${formatDistanceToNow(new Date(chatPartner.last_seen), { addSuffix: true })}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {[Phone, Video, MoreVertical].map((Icon, i) => (
            <button key={i} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">Start your conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div className="relative max-w-[80%]">
                  <div className={cn(
                    "px-3.5 py-2.5 text-[14px] leading-relaxed",
                    isMe
                      ? "bg-primary/20 text-foreground rounded-2xl rounded-br-md border border-primary/20"
                      : "glass-panel text-foreground rounded-2xl rounded-bl-md"
                  )}>
                    {!isMe && msg.sender && (
                      <p className="text-[10px] text-neon mb-0.5 font-medium">{msg.sender.display_name}</p>
                    )}
                    {msg.content}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground px-1",
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

      {/* Input bar - fixed at bottom */}
      <div className="px-3 py-2 border-t border-border flex-shrink-0 bg-background/80 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      >
        <div className="flex items-end gap-2">
          <button className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Message..."
              rows={1}
              className="w-full rounded-2xl bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none max-h-24"
            />
          </div>
          <button className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground flex-shrink-0">
            <Smile className="h-5 w-5" />
          </button>
          {input.trim() ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.85 }}
              onClick={handleSend}
              className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:shadow-[0_0_15px_var(--neon-glow)] transition-all flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
