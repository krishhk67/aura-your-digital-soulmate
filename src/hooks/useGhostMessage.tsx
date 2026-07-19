import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Ghost message controller for a single message.
 * - `revealed`: whether it has been revealed at least once (globally)
 * - `expiresAt`: local expiration wall-clock once the timer starts
 * - `reveal()`: mark the message revealed for this recipient and kick off the timer
 * - `preview()`: peek without revealing (long-press)
 */
export function useGhostMessage(opts: {
  messageId: string;
  isMine: boolean;
  revealSeconds: number | null;
  revealedAt: string | null;
  onExpired?: () => void;
}) {
  const { messageId, isMine, revealSeconds, revealedAt, onExpired } = opts;
  const [revealed, setRevealed] = useState<string | null>(revealedAt);
  const [previewing, setPreviewing] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => { setRevealed(revealedAt); }, [revealedAt]);

  const reveal = useCallback(async () => {
    if (isMine) return;              // sender always sees own content
    if (revealed) return;
    const { data, error } = await (supabase.rpc as unknown as Rpc)("reveal_ghost_message", { _message_id: messageId });
    if (!error) setRevealed((data as string | null) ?? new Date().toISOString());
  }, [isMine, messageId, revealed]);

  const preview = useCallback((on: boolean) => setPreviewing(on), []);

  // Timer: start once revealed
  useEffect(() => {
    if (!revealed || !revealSeconds || revealSeconds <= 0) return;
    const startedAt = new Date(revealed).getTime();
    const endAt = startedAt + revealSeconds * 1000;
    const remaining = endAt - Date.now();
    if (remaining <= 0) { setExpired(true); return; }
    const t = window.setTimeout(() => setExpired(true), remaining);
    return () => window.clearTimeout(t);
  }, [revealed, revealSeconds]);

  // On expire: hard-delete the message so it disappears for everyone
  useEffect(() => {
    if (!expired) return;
    (async () => {
      try {
        await supabase.from("messages").delete().eq("id", messageId);
      } catch {
        /* row may already be gone */
      }
      onExpired?.();
      try { navigator.vibrate?.(6); } catch { /* noop */ }
    })();
  }, [expired, messageId, onExpired]);

  const remainingSeconds = (() => {
    if (!revealed || !revealSeconds) return null;
    const end = new Date(revealed).getTime() + revealSeconds * 1000;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  })();

  return {
    revealed: !!revealed || isMine,
    previewing,
    expired,
    remainingSeconds,
    reveal,
    preview,
  };
}
