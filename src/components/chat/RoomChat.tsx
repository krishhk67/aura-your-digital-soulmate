import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Image as ImageIcon, Smile, X, Reply, Info } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { useRoom, useRoomMessages, useRoomActions, useSignedRoomMedia, type RoomMessageRow } from "@/hooks/useRooms";
import { ReactionPicker, ReactionChips } from "./ReactionPicker";
import { useMessageReactions, useToggleReaction, type ReactionRow } from "@/hooks/useMessageReactions";

const ScrollingContext = createContext(false);

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  if (isYest) return `Yesterday ${time}`;
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}
import { useAuth } from "@/hooks/useAuth";
import { VoiceRecorder, MicButton } from "./VoiceRecorder";
import { AudioMessage } from "./AudioMessage";
import { RoomInfoSheet } from "./RoomInfoSheet";
import { toast } from "sonner";

interface Props {
  roomId: string;
  onBack: () => void;
}

export function RoomChat({ roomId, onBack }: Props) {
  const { user } = useAuth();
  const { room, members } = useRoom(roomId);
  const { messages, loading } = useRoomMessages(roomId);
  const { sendMessage, uploadMedia } = useRoomActions();
  const avatarUrl = useSignedRoomMedia(room?.avatar_url ?? null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<RoomMessageRow | null>(null);
  const [recording, setRecording] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<{ msgId: string; mine: boolean; rect: DOMRect } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const { byMessage: reactionsByMessage } = useMessageReactions("room", roomId, messageIds);
  const toggleReaction = useToggleReaction("room");

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Auto-grow textarea
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  }, [text]);

  const send = async () => {
    if (!text.trim()) return;
    const t = text.trim();
    setText("");
    const replyId = reply?.id ?? null;
    setReply(null);
    const { error } = await sendMessage(roomId, t, { replyTo: replyId });
    if (error) toast.error(error.message);
  };

  const sendFile = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const { error, path } = await uploadMedia(file, ext);
    if (error || !path) { toast.error(error?.message ?? "Upload failed"); return; }
    await sendMessage(roomId, "", { type: isImage ? "image" : isVideo ? "video" : "file", mediaUrl: path });
  };

  const sendVoice = async (blob: Blob, ms: number) => {
    setRecording(false);
    const { error, path } = await uploadMedia(blob, "webm");
    if (error || !path) { toast.error(error?.message ?? "Failed"); return; }
    await sendMessage(roomId, String(ms), { type: "voice", mediaUrl: path });
  };

  // Group consecutive messages by sender within a 5-min window
  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const sameSender = prev && prev.sender_id === m.sender_id;
      const closeInTime = prev && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60_000;
      return { m, grouped: !!(sameSender && closeInTime) };
    });
  }, [messages]);

  // Scroll detection for fading timestamps
  const [scrolling, setScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollingRef = useRef(false);
  const onScroll = () => {
    if (!scrollingRef.current) {
      scrollingRef.current = true;
      setScrolling(true);
    }
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollingRef.current = false;
      setScrolling(false);
    }, 1700);
  };
  useEffect(() => () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); }, []);

  if (!room) return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;

  return (

    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header — compact */}
      <div
        className="flex items-center gap-2 px-2 border-b border-glass-border/60 backdrop-blur-xl bg-background/70"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 6px)", paddingBottom: 6 }}
      >
        <button onClick={onBack} className="p-2 rounded-full active:bg-secondary" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setInfoOpen(true)} className="flex items-center gap-2.5 flex-1 min-w-0 py-1">
          <div className="h-9 w-9 rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              : <span className="font-display gradient-text">{room.name[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-display font-semibold truncate leading-tight text-[15px]">{room.name}</div>
            <div className="text-[10.5px] text-muted-foreground flex items-center gap-1 leading-tight">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_var(--neon-glow)]" />
              {members.length} member{members.length !== 1 ? "s" : ""}
            </div>
          </div>
        </button>
        <button onClick={() => setInfoOpen(true)} className="p-2 rounded-full active:bg-secondary" aria-label="Room info">
          <Info className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <ScrollingContext.Provider value={scrolling}>
      <div onScroll={onScroll} className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0 overscroll-contain">

        {loading && <div className="text-center text-xs text-muted-foreground py-4">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">Start the conversation 👋</div>
        )}
        {grouped.map(({ m, grouped: isGrouped }) => {
          const mine = m.sender_id === user?.id;
          const replyMsg = m.reply_to ? messages.find(x => x.id === m.reply_to) : null;
          return (
            <MessageRow
              key={m.id}
              m={m}
              mine={mine}
              grouped={isGrouped}
              replyMsg={replyMsg ?? null}
              onReply={() => setReply(m)}
              reactions={reactionsByMessage.get(m.id) ?? []}
              currentUserId={user?.id}
              onToggleReaction={(emoji) => void toggleReaction(m.id, emoji)}
              onLongPress={(rect) => setReactionTarget({ msgId: m.id, mine, rect })}
            />
          );
        })}
        <div ref={endRef} />
      </div>
      </ScrollingContext.Provider>



      {/* Reply preview */}
      {reply && (
        <div className="px-3 py-2 border-t border-glass-border flex items-center gap-2 bg-secondary/30">
          <Reply className="h-4 w-4 text-neon flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
            Replying to {reply.sender?.display_name ?? "member"}: {reply.content ?? reply.message_type}
          </div>
          <button onClick={() => setReply(null)} className="p-1 rounded active:bg-secondary" aria-label="Cancel reply">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div
        className="px-2.5 pt-2 border-t border-glass-border/60 bg-background/70 backdrop-blur-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        {recording ? (
          <VoiceRecorder onCancel={() => setRecording(false)} onSend={sendVoice} />
        ) : (
          <div className="flex items-end gap-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center active:bg-secondary text-muted-foreground"
              aria-label="Attach"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }}
            />
            <div className="flex-1 min-w-0 flex items-end bg-secondary/50 rounded-[22px] px-3 py-1.5 border border-glass-border">
              <textarea
                ref={taRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message the room"
                className="flex-1 bg-transparent outline-none text-[15px] leading-snug py-1 resize-none max-h-[132px]"
                style={{ minHeight: 22 }}
              />
              <Smile className="h-5 w-5 text-muted-foreground mb-1 ml-1 flex-shrink-0" />
            </div>
            {text.trim() ? (
              <button
                onClick={send}
                className="h-10 w-10 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform shadow-[0_0_16px_var(--neon-glow)]"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <MicButton onClick={() => setRecording(true)} />
            )}
          </div>
        )}
      </div>

      <RoomInfoSheet roomId={roomId} open={infoOpen} onClose={() => setInfoOpen(false)} onLeft={onBack} />
    </div>
  );
}

/* ─── Message row with swipe-to-reply ─── */
function MessageRow({
  m, mine, grouped, replyMsg, onReply, reactions, currentUserId, onToggleReaction, onLongPress,
}: {
  m: RoomMessageRow;
  mine: boolean;
  grouped: boolean;
  replyMsg: RoomMessageRow | null;
  onReply: () => void;
  reactions: ReactionRow[];
  currentUserId: string | undefined;
  onToggleReaction: (emoji: string) => void;
  onLongPress: (rect: DOMRect) => void;
}) {
  const longPressTimer = useRef<number | null>(null);
  const startLongPress = (e: React.PointerEvent) => {
    const target = e.currentTarget as Element;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      onLongPress(rect);
      try { navigator.vibrate?.(10); } catch { /* noop */ }
    }, 380);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const x = useMotionValue(0);
  // Reply indicator opacity fades in as user swipes left
  const indicatorOpacity = useTransform(x, [-80, -20, 0], [1, 0, 0]);
  const indicatorScale = useTransform(x, [-80, -20, 0], [1, 0.6, 0.6]);
  const triggeredRef = useRef(false);

  const onDrag = (_e: unknown, info: PanInfo) => {
    // haptic when threshold crossed
    if (!triggeredRef.current && info.offset.x < -60) {
      triggeredRef.current = true;
      try { navigator.vibrate?.(12); } catch { /* noop */ }
    }
    if (triggeredRef.current && info.offset.x > -40) {
      triggeredRef.current = false;
    }
  };

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -60) {
      onReply();
    }
    animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
    triggeredRef.current = false;
  };

  const isMedia = m.message_type === "image" || m.message_type === "video";
  const isVoice = m.message_type === "voice";
  const isText = !isMedia && !isVoice;

  return (
    <div className={`relative flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-px" : "mt-1.5"}`}>
      {/* Swipe reply indicator (right side) */}
      <motion.div
        aria-hidden
        style={{ opacity: indicatorOpacity, scale: indicatorScale }}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-neon pointer-events-none"
      >
        <Reply className="h-4 w-4" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.55, right: 0 }}
        dragDirectionLock
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        style={{ x }}
        className={`group flex gap-2 max-w-[82%] ${mine ? "flex-row-reverse" : "flex-row"} touch-pan-y`}
      >
        {!mine && !grouped ? (
          <div className="h-6 w-6 mt-0.5 rounded-full bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px]">
            {m.sender?.avatar_url
              ? <img src={m.sender.avatar_url} alt="" className="h-full w-full object-cover" />
              : (m.sender?.display_name ?? "?")[0]?.toUpperCase()}
          </div>
        ) : !mine ? (
          <div className="w-6 flex-shrink-0" />
        ) : null}

        <div className="relative min-w-0 flex flex-col">
          {/* Metadata row: sender name (left) + timestamp (right, fades with scroll).
              Shown only for the first message in a group. */}
          {!grouped && (
            <MetaRow
              mine={mine}
              name={mine ? "You" : (m.sender?.display_name ?? m.sender?.username ?? "Member")}
              time={formatMsgTime(m.created_at)}
            />
          )}
          <div
            className={`rounded-[14px] ${
              isMedia ? "p-1 overflow-hidden" : isVoice ? "px-2 py-1" : "px-2.5 py-1"
            } ${
              mine
                ? "bg-primary text-primary-foreground rounded-br-[6px] self-end"
                : "bg-secondary rounded-bl-[6px] self-start"
            } ${grouped ? (mine ? "rounded-tr-[6px]" : "rounded-tl-[6px]") : ""} ${
              isText ? "shadow-[0_1px_2px_rgba(0,0,0,0.25)]" : ""
            }`}
          >
            {replyMsg && (
              <div className={`text-[11px] opacity-75 border-l-2 border-current pl-2 mb-1 truncate ${isMedia ? "mx-1 mt-0.5" : ""}`}>
                ↪ {replyMsg.content ?? replyMsg.message_type}
              </div>
            )}
            <RoomMsgBody m={m} />
          </div>



          {/* Reply icon outside bubble (bottom-right / bottom-left depending on side) */}
          <button
            onClick={onReply}
            aria-label="Reply"
            className={`absolute -bottom-1 ${mine ? "-left-6" : "-right-6"} h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground opacity-40 md:opacity-0 md:group-hover:opacity-90 active:opacity-100 transition-opacity`}
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* Sender name + right-aligned timestamp. Timestamp fades in during scroll. */
function MetaRow({ mine, name, time }: { mine: boolean; name: string; time: string }) {
  const scrolling = useContext(ScrollingContext);
  return (
    <div className={`flex items-baseline gap-2 mb-0.5 px-1 ${mine ? "flex-row-reverse" : ""}`}>
      <span className={`text-[11px] font-semibold leading-tight truncate ${mine ? "text-muted-foreground" : "text-neon"}`}>
        {name}
      </span>
      <span
        aria-hidden={!scrolling}
        className="text-[10px] text-muted-foreground leading-tight tabular-nums transition-opacity duration-300 ease-out"
        style={{ opacity: scrolling ? 0.4 : 0 }}
      >
        {time}
      </span>
    </div>
  );
}



function RoomMsgBody({ m }: { m: RoomMessageRow }) {
  const url = useSignedRoomMedia(m.media_url);
  if (m.message_type === "image" && url) {
    return <img src={url} alt="" className="block rounded-[10px] max-h-64 w-full object-cover" />;
  }
  if (m.message_type === "video" && url) {
    return <video src={url} controls className="block rounded-[10px] max-h-64 w-full" />;
  }
  if (m.message_type === "voice" && url) {
    return <AudioMessage url={url} durationHintMs={Number(m.content) || undefined} />;
  }
  return <div className="text-[14.5px] leading-snug whitespace-pre-wrap break-words">{m.content}</div>;
}

