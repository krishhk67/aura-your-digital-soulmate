import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, RefreshCw, Wand2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { smartReplies } from "@/lib/ai-chat.functions";
import { aiCall, AiError } from "@/lib/ai-client";
import { toast } from "sonner";
import type { MessageRow, ProfileRow } from "@/hooks/useRealtimeChat";

type Style = "chill" | "funny" | "savage" | "romantic" | "formal" | "genz";

const STYLES: { id: Style; emoji: string; label: string }[] = [
  { id: "chill", emoji: "😎", label: "Chill" },
  { id: "funny", emoji: "😂", label: "Funny" },
  { id: "savage", emoji: "💀", label: "Savage" },
  { id: "romantic", emoji: "❤️", label: "Romantic" },
  { id: "formal", emoji: "📄", label: "Formal" },
  { id: "genz", emoji: "⚡", label: "Gen-Z" },
];

interface Props {
  messages: (MessageRow & { sender?: ProfileRow })[];
  currentUserId: string | undefined;
  onInsert: (text: string) => void;
  onSend: (text: string) => void;
}

export function SmartReplyBar({ messages, currentUserId, onInsert, onSend }: Props) {
  const [style, setStyle] = useState<Style>("chill");
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(smartReplies);

  const transcript = messages
    .slice(-10)
    .filter((m) => (!m.message_type || m.message_type === "text") && m.content)
    .map((m) => ({
      sender: m.sender_id === currentUserId ? "Me" : m.sender?.display_name ?? "Them",
      content: m.content as string,
    }));

  const last = messages[messages.length - 1];
  const trigger = last && last.sender_id !== currentUserId ? last.id : "";

  // Clear stale replies when the active chat / last incoming message changes.
  // We never auto-call AI — user must press Generate.
  useEffect(() => { setReplies([]); }, [trigger]);

  const fetchReplies = async (force = false) => {
    if (!transcript.length || !trigger || loading) return;
    setLoading(true);
    try {
      const r = await aiCall(
        "smartReplies",
        { messages: transcript, style },
        fn,
        { force, ttlMs: 90_000 },
      );
      setReplies((r as { replies: string[] }).replies ?? []);
    } catch (e) {
      const msg = e instanceof AiError ? e.userMessage : "AI temporarily unavailable.";
      toast.error(msg);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  if (!trigger) return null;

  return (
    <div className="px-2 pt-1 pb-1 border-t border-glass-border bg-background/70 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Sparkles className="h-3 w-3 text-neon" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Smart replies</span>
        {replies.length > 0 && (
          <button
            onClick={() => fetchReplies(true)}
            disabled={loading}
            className="ml-auto h-6 w-6 rounded-full flex items-center justify-center hover:bg-secondary text-muted-foreground disabled:opacity-50"
            title="Regenerate"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1.5 px-1">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition-all ${
              style === s.id
                ? "bg-primary/20 border-primary/40 text-neon"
                : "border-border text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            <span className="mr-1">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 px-1 min-h-[36px] items-center">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-1"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" style={{ animationDelay: "120ms" }} />
              <div className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" style={{ animationDelay: "240ms" }} />
              Thinking…
            </motion.div>
          ) : replies.length === 0 ? (
            <motion.button
              key="generate"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => fetchReplies(false)}
              className="flex items-center gap-1.5 text-[11px] text-neon px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Wand2 className="h-3 w-3" /> Generate replies
            </motion.button>
          ) : (
            replies.map((r, i) => (
              <motion.div
                key={`${r}-${i}`}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
                className="flex-shrink-0 flex items-center gap-1 glass-panel border border-glass-border rounded-full pl-3 pr-1 py-1"
              >
                <button onClick={() => onInsert(r)} className="text-[12px] text-foreground max-w-[200px] truncate">
                  {r}
                </button>
                <button
                  onClick={() => onSend(r)}
                  className="h-6 w-6 rounded-full bg-primary/20 hover:bg-primary/30 text-neon flex items-center justify-center"
                  title="Send"
                >
                  <Send className="h-3 w-3" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
