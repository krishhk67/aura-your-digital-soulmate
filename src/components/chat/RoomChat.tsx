import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Image as ImageIcon, Smile, X, Reply } from "lucide-react";
import { motion } from "framer-motion";
import { useRoom, useRoomMessages, useRoomActions, useSignedRoomMedia, type RoomMessageRow } from "@/hooks/useRooms";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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

  if (!room) return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center gap-3 px-3 pt-[env(safe-area-inset-top,12px)] pb-2 border-b border-glass-border">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => setInfoOpen(true)} className="flex items-center gap-3 flex-1 min-w-0 py-1.5">
          <div className="h-9 w-9 rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-display gradient-text">{room.name[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-display font-semibold truncate">{room.name}</div>
            <div className="text-[11px] text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</div>
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && <div className="text-center text-xs text-muted-foreground py-4">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">Start the conversation 👋</div>
        )}
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          const replyMsg = m.reply_to ? messages.find(x => x.id === m.reply_to) : null;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
            >
              {!mine && (
                <div className="h-7 w-7 rounded-full bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center text-xs">
                  {m.sender?.avatar_url ? <img src={m.sender.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.sender?.display_name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {!mine && <div className="text-[11px] font-semibold opacity-80 mb-0.5">{m.sender?.display_name ?? m.sender?.username ?? "Member"}</div>}
                {replyMsg && (
                  <div className="text-[11px] opacity-70 border-l-2 border-current pl-2 mb-1 truncate">↪ {replyMsg.content ?? replyMsg.message_type}</div>
                )}
                <RoomMsgBody m={m} />
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <button onClick={() => setReply(m)} className="text-[10px] opacity-60 hover:opacity-100 flex items-center gap-0.5"><Reply className="h-3 w-3" />Reply</button>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      {reply && (
        <div className="px-3 py-2 border-t border-glass-border flex items-center gap-2 bg-secondary/30">
          <Reply className="h-4 w-4 text-neon flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate">Replying to {reply.sender?.display_name ?? "member"}: {reply.content ?? reply.message_type}</div>
          <button onClick={() => setReply(null)} className="p-1 rounded hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="px-3 py-2 border-t border-glass-border pb-[env(safe-area-inset-bottom,8px)]">
        {recording ? (
          <VoiceRecorder onCancel={() => setRecording(false)} onSend={sendVoice} />
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }} />
            <div className="flex-1 flex items-center bg-secondary/40 rounded-2xl px-3 py-1.5 border border-glass-border">
              <input
                value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message the room"
                className="flex-1 bg-transparent outline-none text-sm py-1.5"
              />
              <Smile className="h-4 w-4 text-muted-foreground" />
            </div>
            {text.trim() ? (
              <button onClick={send} className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
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

function RoomMsgBody({ m }: { m: RoomMessageRow }) {
  const url = useSignedRoomMedia(m.media_url);
  if (m.message_type === "image" && url) {
    return <img src={url} alt="" className="rounded-xl max-h-72 object-cover" />;
  }
  if (m.message_type === "video" && url) {
    return <video src={url} controls className="rounded-xl max-h-72" />;
  }
  if (m.message_type === "voice" && url) {
    return <AudioMessage url={url} durationHintMs={Number(m.content) || undefined} />;
  }
  return <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>;
}
