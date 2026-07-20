import { useEffect, useState } from "react";
import { Users, EyeOff, Check } from "lucide-react";
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

/** Compact native chat-event card for an anonymous space. */
export function SpaceCard({ chatId, spaceIdHint, title, onEnter }: Props) {
  const { space: activeSpace, participantCount } = useActiveSpaceForChat(chatId);
  const [hintSpace, setHintSpace] = useState<AnonSpace | null>(null);

  const space = activeSpace ?? hintSpace;
  const isLive = !!activeSpace && (!spaceIdHint || activeSpace.id === spaceIdHint);

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

  const startedAt = space?.created_at;
  const endedAt = space?.destroyed_at;

  return (
    <div className="my-2 mx-auto w-full max-w-[300px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
          <EyeOff className="h-3.5 w-3.5 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-white/90 truncate">
              {title || "Anonymous Space"}
            </span>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isLive ? "bg-emerald-400 animate-pulse" : "bg-white/25"
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/45 leading-tight">
            {isLive ? (
              <>
                <Users className="h-3 w-3" />
                <span>{participantCount} inside</span>
                {startedAt && <span className="text-white/25">· {formatTime(startedAt)}</span>}
              </>
            ) : (
              <span>
                {startedAt && `${formatTime(startedAt)}`}
                {startedAt && endedAt && " – "}
                {endedAt && formatTime(endedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {isLive && activeSpace ? (
        <button
          onClick={() => onEnter(activeSpace.id)}
          className="mt-2.5 w-full rounded-lg bg-white text-black py-1.5 text-[12.5px] font-semibold active:scale-[0.98] transition-transform"
        >
          Enter Space
        </button>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40">
          <Check className="h-3 w-3" />
          <span>Space ended · Permanently erased</span>
        </div>
      )}
    </div>
  );
}
