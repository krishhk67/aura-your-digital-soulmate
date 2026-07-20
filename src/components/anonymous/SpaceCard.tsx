import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useActiveSpaceForChat, type AnonSpace } from "@/hooks/useAnonymousSpace";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  chatId: string;
  spaceIdHint?: string | null;
  title?: string | null;
  onEnter: (spaceId: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Premium compact timeline event for an anonymous space. */
export function SpaceCard({ chatId, spaceIdHint, title, onEnter }: Props) {
  const { space: activeSpace, participantCount: liveCount } = useActiveSpaceForChat(chatId);
  const [hintSpace, setHintSpace] = useState<AnonSpace | null>(null);
  const [totalJoined, setTotalJoined] = useState<number>(0);

  const space = activeSpace ?? hintSpace;
  const isLive = !!activeSpace && (!spaceIdHint || activeSpace.id === spaceIdHint);
  const spaceId = space?.id ?? spaceIdHint ?? null;

  useEffect(() => {
    if (activeSpace || !spaceIdHint) { setHintSpace(null); return; }
    let cancelled = false;
    void supabase
      .from("anonymous_spaces")
      .select("*")
      .eq("id", spaceIdHint)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setHintSpace((data as AnonSpace | null) ?? null); });
    return () => { cancelled = true; };
  }, [activeSpace, spaceIdHint]);

  useEffect(() => {
    if (!spaceId) { setTotalJoined(0); return; }
    let cancelled = false;
    void supabase
      .from("anonymous_participants")
      .select("id", { count: "exact", head: true })
      .eq("space_id", spaceId)
      .then(({ count }) => { if (!cancelled) setTotalJoined(count ?? 0); });
    return () => { cancelled = true; };
  }, [spaceId, liveCount]);

  const startedAt = space?.created_at;
  const endedAt = space?.destroyed_at;
  const participants = isLive ? Math.max(totalJoined, liveCount) : totalJoined;

  return (
    <div className="my-2 mx-auto w-full max-w-[300px] rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-white/60">
        <Sparkles className="h-3 w-3 text-emerald-300/80" />
        Anonymous Space
      </div>

      {title && (
        <div className="mt-1 text-[13px] font-medium text-white/85 truncate">{title}</div>
      )}

      <div className="mt-2 space-y-1 text-[12px] text-white/60 leading-snug">
        <div className="flex items-center gap-1.5">
          <span>👥</span>
          <span className="tabular-nums text-white/80">{participants}</span>
          <span className="text-white/45">
            {participants === 1 ? "Participant" : "Participants"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🕘</span>
          {isLive ? (
            <span>
              <span className="text-white/45">Started </span>
              <span className="tabular-nums text-white/80">{startedAt ? formatTime(startedAt) : "—"}</span>
            </span>
          ) : (
            <span className="tabular-nums text-white/75">
              {startedAt ? formatTime(startedAt) : "—"}
              <span className="text-white/35"> → </span>
              {endedAt ? formatTime(endedAt) : "—"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium">
        {isLive ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse" />
            <span className="text-emerald-300/90">Active</span>
          </>
        ) : (
          <>
            <span className="text-white/40">✔</span>
            <span className="text-white/45">Permanently erased</span>
          </>
        )}
      </div>

      {isLive && activeSpace && (
        <button
          onClick={() => onEnter(activeSpace.id)}
          className="mt-3 w-full rounded-lg bg-white text-black py-1.5 text-[12.5px] font-semibold active:scale-[0.98] transition-transform"
        >
          Enter
        </button>
      )}
    </div>
  );
}
