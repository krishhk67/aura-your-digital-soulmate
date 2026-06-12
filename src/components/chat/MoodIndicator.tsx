import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Smile } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { detectMood } from "@/lib/ai-chat.functions";
import { aiCall, AiError } from "@/lib/ai-client";
import type { MessageRow, ProfileRow } from "@/hooks/useRealtimeChat";

export type MoodId =
  | "happy" | "calm" | "professional" | "sad" | "heated" | "late_night" | "excited" | "neutral";

export const MOOD_META: Record<MoodId, { emoji: string; label: string; accent: string }> = {
  happy:        { emoji: "😊", label: "Happy",        accent: "rgba(255, 215, 64, 0.55)" },
  calm:         { emoji: "😌", label: "Calm",         accent: "rgba(110, 231, 183, 0.45)" },
  professional: { emoji: "💼", label: "Professional", accent: "rgba(148, 163, 184, 0.40)" },
  sad:          { emoji: "😢", label: "Sad",          accent: "rgba(96, 165, 250, 0.45)" },
  heated:       { emoji: "😡", label: "Heated",       accent: "rgba(248, 113, 113, 0.55)" },
  late_night:   { emoji: "🌙", label: "Late Night",   accent: "rgba(129, 140, 248, 0.50)" },
  excited:      { emoji: "🎉", label: "Excited",      accent: "rgba(244, 114, 182, 0.55)" },
  neutral:      { emoji: "✨", label: "Neutral",      accent: "rgba(255, 255, 255, 0.18)" },
};

interface Props {
  messages: (MessageRow & { sender?: ProfileRow })[];
  currentUserId: string | undefined;
  onMoodChange?: (mood: MoodId) => void;
}

export function MoodIndicator({ messages, currentUserId, onMoodChange }: Props) {
  const [mood, setMood] = useState<MoodId | null>(null);
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(detectMood);

  // Reset mood when switching chats — never auto-call AI on tab/chat change.
  const conversationKey = messages[0]?.conversation_id ?? "";
  useEffect(() => {
    setMood(null);
    onMoodChange?.("neutral");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  const analyze = async () => {
    const textMsgs = messages.filter((m) => (!m.message_type || m.message_type === "text") && m.content);
    if (textMsgs.length < 2) {
      toast("Not enough messages yet to analyze mood.");
      return;
    }
    const transcript = textMsgs.slice(-14).map((m) => ({
      sender: m.sender_id === currentUserId ? "Me" : m.sender?.display_name ?? "Them",
      content: m.content as string,
    }));
    setLoading(true);
    try {
      const r = await aiCall("detectMood", { messages: transcript }, fn, { ttlMs: 120_000 });
      const parsed = r as { mood?: string };
      const id = ((parsed.mood as MoodId) in MOOD_META ? parsed.mood : "neutral") as MoodId;
      setMood(id);
      onMoodChange?.(id);
    } catch (e) {
      toast.error(e instanceof AiError ? e.userMessage : "AI temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  if (!mood) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] border border-glass-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-60"
        title="Analyze chat mood"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Smile className="h-3 w-3" />}
        {loading ? "Analyzing…" : "Mood"}
      </button>
    );
  }

  const meta = MOOD_META[mood];
  return (
    <AnimatePresence>
      <motion.button
        key={mood}
        onClick={analyze}
        disabled={loading}
        initial={{ opacity: 0, y: -4, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[10px] border border-glass-border bg-background/60 hover:border-primary/40 transition-colors disabled:opacity-60"
        title={`Mood: ${meta.label} — tap to re-analyze`}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{meta.emoji}</span>}
        <span className="text-muted-foreground">{meta.label}</span>
      </motion.button>
    </AnimatePresence>
  );
}
