import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { detectMood } from "@/lib/ai-chat.functions";
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
  const fn = useServerFn(detectMood);
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    const textMsgs = messages.filter((m) => (!m.message_type || m.message_type === "text") && m.content);
    if (textMsgs.length < 3) return;
    // Re-evaluate every 5 new messages, or when the last id changes substantially
    const last = textMsgs[textMsgs.length - 1];
    const sig = `${textMsgs.length - (textMsgs.length % 5)}:${last.id}`;
    if (sig === lastSigRef.current) return;
    // Only re-fetch on every 5th message after the first analysis
    if (lastSigRef.current && textMsgs.length % 5 !== 0) return;
    lastSigRef.current = sig;

    const transcript = textMsgs.slice(-14).map((m) => ({
      sender: m.sender_id === currentUserId ? "Me" : m.sender?.display_name ?? "Them",
      content: m.content as string,
    }));

    (async () => {
      try {
        const r = await fn({ data: { messages: transcript } });
        const id = (r.mood as MoodId) in MOOD_META ? (r.mood as MoodId) : "neutral";
        setMood(id);
        onMoodChange?.(id);
      } catch {
        /* silent */
      }
    })();
  }, [messages, currentUserId, fn, onMoodChange]);

  if (!mood) return null;
  const meta = MOOD_META[mood];

  return (
    <AnimatePresence>
      <motion.div
        key={mood}
        initial={{ opacity: 0, y: -4, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[10px] border border-glass-border bg-background/60"
        title={`Mood: ${meta.label}`}
      >
        <span>{meta.emoji}</span>
        <span className="text-muted-foreground">{meta.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
