import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCallHistory, useCalls } from "@/hooks/useCalls";
import { useAuth } from "@/hooks/useAuth";

function fmtDuration(sec: number) {
  if (!sec) return "";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function CallsHistoryView() {
  const { user } = useAuth();
  const { calls, loading } = useCallHistory();
  const { startCall } = useCalls();

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 pt-[env(safe-area-inset-top,16px)] pb-3 border-b border-glass-border">
        <h1 className="font-display text-2xl font-bold gradient-text">Calls</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Realtime voice & video, secured end-to-end</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-center text-xs text-muted-foreground py-8">Loading…</div>}
        {!loading && calls.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Phone className="h-7 w-7 text-neon" />
            </div>
            <h3 className="font-display text-lg font-bold">No calls yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Start a voice or video call from any chat.</p>
          </div>
        )}

        <ul className="divide-y divide-glass-border">
          {calls.map(c => {
            const outgoing = c.caller_id === user?.id;
            const missed = c.status === "missed" || (c.status === "rejected" && !outgoing);
            const Icon = missed ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;
            const iconColor = missed ? "text-destructive" : outgoing ? "text-neon" : "text-accent";
            const peer = c.peer;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40">
                <div className="h-11 w-11 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                  {peer?.avatar_url
                    ? <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" />
                    : <span className="font-display">{peer?.display_name?.[0]?.toUpperCase() ?? "?"}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${missed ? "text-destructive" : ""}`}>
                    {peer?.display_name ?? peer?.username ?? "Unknown"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Icon className={`h-3 w-3 ${iconColor}`} />
                    <span className="capitalize">{c.call_type}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    {c.duration_seconds > 0 && <><span>·</span><span>{fmtDuration(c.duration_seconds)}</span></>}
                  </div>
                </div>
                {peer && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => void startCall(peer.id, "voice", c.chat_id)}
                      className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary text-neon">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button onClick={() => void startCall(peer.id, "video", c.chat_id)}
                      className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary text-neon">
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
