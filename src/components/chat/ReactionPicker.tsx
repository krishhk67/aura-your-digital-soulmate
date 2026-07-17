import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { fetchReactionProfiles, type ReactionRow } from "@/hooks/useMessageReactions";
import type { ProfileRow } from "@/hooks/useRealtimeChat";

export const DEFAULT_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

/**
 * Floating glass reaction bar rendered in a portal at a fixed screen
 * position above the anchor rectangle. Auto-dismisses on outside click / Esc.
 */
export function ReactionPicker({
  anchorRect, mine, myEmojis, onPick, onClose,
}: {
  anchorRect: DOMRect | null;
  mine: boolean;
  myEmojis: Set<string>;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!anchorRect) return null;

  const barWidth = 300;
  const barHeight = 52;
  const margin = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Prefer above; fall back below when near the top
  const preferAbove = anchorRect.top - barHeight - margin > 12;
  const top = preferAbove
    ? Math.max(12, anchorRect.top - barHeight - margin)
    : Math.min(vh - barHeight - 12, anchorRect.bottom + margin);

  const centerX = mine ? anchorRect.right - barWidth / 2 : anchorRect.left + barWidth / 2;
  const left = Math.min(vw - barWidth - 8, Math.max(8, centerX - barWidth / 2));

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="picker-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        onPointerDown={onClose}
      >
        <motion.div
          key="picker-bar"
          initial={{ opacity: 0, y: preferAbove ? 6 : -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: preferAbove ? 6 : -6, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ position: "fixed", top, left, width: barWidth, height: barHeight }}
          className="rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-around px-2"
        >
          {DEFAULT_REACTIONS.map((emoji, i) => {
            const picked = myEmojis.has(emoji);
            return (
              <motion.button
                key={emoji}
                initial={{ scale: 0, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: i * 0.02, type: "spring", stiffness: 600, damping: 22 }}
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.85 }}
                onClick={(e) => { e.stopPropagation(); onPick(emoji); }}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-[22px] leading-none",
                  picked && "bg-primary/30 ring-1 ring-primary/60",
                )}
              >
                <span>{emoji}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Grouped reaction chips shown under a message bubble.
 * Tapping a chip toggles the current user's reaction on that emoji.
 * Long-pressing (or tapping the count) opens the "who reacted" sheet.
 */
export function ReactionChips({
  reactions, currentUserId, mine, onToggle,
}: {
  reactions: ReactionRow[];
  currentUserId: string | undefined;
  mine: boolean;
  onToggle: (emoji: string) => void;
}) {
  const [sheetEmoji, setSheetEmoji] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    if (!sheetEmoji) return;
    const users = reactions.filter(r => r.emoji === sheetEmoji).map(r => r.user_id);
    fetchReactionProfiles([...new Set(users)]).then(setProfiles);
  }, [sheetEmoji, reactions]);

  if (reactions.length === 0) return null;

  // Group by emoji preserving first-seen order.
  const groups: Array<{ emoji: string; users: string[] }> = [];
  const seen = new Map<string, number>();
  for (const r of reactions) {
    const idx = seen.get(r.emoji);
    if (idx === undefined) { seen.set(r.emoji, groups.length); groups.push({ emoji: r.emoji, users: [r.user_id] }); }
    else groups[idx].users.push(r.user_id);
  }

  return (
    <>
      <div className={cn("flex flex-wrap gap-1 mt-0.5", mine ? "justify-end" : "justify-start")}>
        {groups.map(g => {
          const isMine = !!currentUserId && g.users.includes(currentUserId);
          return (
            <motion.button
              key={g.emoji}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggle(g.emoji)}
              onContextMenu={(e) => { e.preventDefault(); setSheetEmoji(g.emoji); }}
              className={cn(
                "h-6 px-2 rounded-full text-[12px] leading-none flex items-center gap-1 border transition-colors",
                isMine
                  ? "bg-primary/25 border-primary/50 text-foreground"
                  : "bg-secondary/70 border-glass-border text-foreground/85 hover:bg-secondary",
              )}
            >
              <span className="text-[14px]">{g.emoji}</span>
              <span className="tabular-nums">{g.users.length}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {sheetEmoji && createPortal(
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setSheetEmoji(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-background border-t sm:border sm:rounded-2xl border-glass-border max-h-[60vh] overflow-hidden flex flex-col rounded-t-2xl"
            >
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <span className="text-2xl">{sheetEmoji}</span>
                <span className="text-sm font-medium">
                  {reactions.filter(r => r.emoji === sheetEmoji).length} {reactions.filter(r => r.emoji === sheetEmoji).length === 1 ? "reaction" : "reactions"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-1">
                {reactions.filter(r => r.emoji === sheetEmoji).map(r => {
                  const p = profiles[r.user_id];
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold">
                          {(p?.display_name ?? "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-sm truncate">
                        {p?.display_name ?? p?.username ?? "User"}
                        {r.user_id === currentUserId && <span className="ml-2 text-[11px] text-muted-foreground">Tap chip to remove</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
      </AnimatePresence>
    </>
  );
}
