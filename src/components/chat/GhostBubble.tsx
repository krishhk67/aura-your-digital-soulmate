import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost } from "lucide-react";
import { useGhostMessage } from "@/hooks/useGhostMessage";

interface Props {
  messageId: string;
  isMine: boolean;
  revealSeconds: number | null;
  revealedAt: string | null;
  content: string | null;
}

/**
 * Ghost message bubble.
 * - Hidden with "Tap to reveal" until tapped (recipient only).
 * - Long-press previews without starting timer.
 * - After reveal timer, contents dissolve and row is deleted.
 */
export function GhostBubble({ messageId, isMine, revealSeconds, revealedAt, content }: Props) {
  const { revealed, previewing, expired, remainingSeconds, reveal, preview } = useGhostMessage({
    messageId, isMine, revealSeconds, revealedAt,
  });

  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const onPointerDown = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      preview(true);
    }, 380);
  };
  const onPointerUp = () => {
    if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (longPressed.current) { preview(false); return; }
    if (!revealed) void reveal();
  };
  const onPointerLeave = () => {
    if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (longPressed.current) { preview(false); longPressed.current = false; }
  };

  const showContent = revealed || previewing;

  return (
    <AnimatePresence>
      {!expired && (
        <motion.div
          key="ghost"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(12px)", scale: 0.94 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerLeave}
          onPointerLeave={onPointerLeave}
        >
          {!showContent ? (
            <div className="flex items-center gap-2 py-0.5">
              <motion.span
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/85"
              >
                <Ghost className="h-3.5 w-3.5" /> Ghost Message
              </motion.span>
              <span className="text-[10px] text-white/40">Tap to reveal</span>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre-wrap break-words">
              {content}
              {revealed && !isMine && remainingSeconds !== null && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-white/45 align-baseline">
                  {remainingSeconds}s
                </span>
              )}
              {isMine && revealSeconds && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-white/40 align-baseline">
                  👻 {revealSeconds}s
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
