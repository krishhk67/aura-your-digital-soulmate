import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, ArrowLeft, Phone, Video, MoreVertical, CheckCheck, Image as ImageIcon, FileText, Film, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatMessages, useSendMessage } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow, ChatRow } from "@/hooks/useRealtimeChat";
import { toast } from "sonner";
import { VoiceRecorder, MicButton } from "./VoiceRecorder";
import { AudioMessage } from "./AudioMessage";
import { ChatProfileSheet } from "./ChatProfileSheet";
import { ChatActionsSheet } from "./ChatActionsSheet";
import { ChatSearchOverlay } from "./ChatSearchOverlay";
import { useChatMemberState } from "@/hooks/useChatActions";
import { Pin, BellOff } from "lucide-react";

interface ChatWindowProps {
  chatId: string | null;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const { messages, loading } = useChatMessages(chatId);
  const sendMessage = useSendMessage();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatPartner, setChatPartner] = useState<ProfileRow | null>(null);
  const [chatMeta, setChatMeta] = useState<ChatRow | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [recording, setRecording] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [acceptType, setAcceptType] = useState("image/*,video/*");
  const [uploading, setUploading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { is_pinned, is_muted, cleared_at } = useChatMemberState(chatId);

  const visibleMessages = cleared_at
    ? messages.filter(m => new Date(m.created_at) > new Date(cleared_at))
    : messages;

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !user) return;
    // Reset previous conversation state to avoid stale headers
    setChatPartner(null);
    setChatMeta(null);
    setMemberCount(0);
    window.setTimeout(() => inputRef.current?.focus(), 250);
    console.info("[Aura] switching conversation", { chatId });
    (async () => {
      const { data: chat } = await supabase.from("chats").select("*").eq("id", chatId).single();
      if (!chat) return;
      setChatMeta(chat as ChatRow);
      console.info("[Aura] chat loaded", { chatId, is_group: chat.is_group, name: chat.name });

      const { data: members } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId);
      setMemberCount(members?.length ?? 0);

      if (!chat.is_group) {
        const other = members?.find(m => m.user_id !== user.id);
        if (other) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", other.user_id)
            .single();
          if (profile) setChatPartner(profile as ProfileRow);
        }
      }

      await supabase.from("chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("chat_id", chatId)
        .eq("user_id", user.id);
    })();
  }, [chatId, user]);

  const handleSend = async () => {
    if (!input.trim() || !chatId) return;
    const text = input;
    setInput("");
    const { error } = await sendMessage(chatId, text);
    if (error) {
      setInput(text);
      toast.error(error.message);
    }
    inputRef.current?.focus();
  };

  const uploadAndSend = async (file: File) => {
    if (!chatId || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${chatId}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const url = signed?.signedUrl ?? "";
      const type = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("video/") ? "video"
        : file.type.startsWith("audio/") ? "audio" : "file";
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId, sender_id: user.id, message_type: type, media_url: url, content: type === "file" ? file.name : null,
      });
      if (error) throw error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) uploadAndSend(f);
    e.target.value = "";
  };

  const sendVoice = async (blob: Blob, durationMs: number) => {
    if (!chatId || !user) { setRecording(false); return; }
    setUploading(true);
    try {
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const path = `${chatId}/${user.id}-voice-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, blob, { contentType: blob.type || "audio/webm" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const url = signed?.signedUrl ?? "";
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId, sender_id: user.id, message_type: "audio", media_url: url, content: `${Math.round(durationMs / 1000)}s`,
      });
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice send failed");
    } finally {
      setUploading(false);
      setRecording(false);
    }
  };

  if (!chatId) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      <input ref={fileInputRef} type="file" accept={acceptType} onChange={handleFile} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border glass-panel rounded-none flex-shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}>
        {onBack && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
        )}

        <button onClick={() => setProfileOpen(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="relative flex-shrink-0">
            {chatMeta?.is_group ? (
              chatMeta.avatar_url ? (
                <img src={chatMeta.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">
                  👥
                </div>
              )
            ) : chatPartner?.avatar_url ? (
              <img src={chatPartner.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">
                {chatPartner?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            {!chatMeta?.is_group && chatPartner?.is_online && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border-2 border-background" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {chatMeta?.is_group
                ? (chatMeta.name ?? "Group")
                : (chatPartner?.display_name ?? (chatMeta ? "User" : "Loading..."))}
            </h3>
            <p className="text-[11px] text-accent flex items-center gap-1">
              {is_pinned && <Pin className="h-2.5 w-2.5" />}
              {is_muted && <BellOff className="h-2.5 w-2.5" />}
              <span>
                {chatMeta?.is_group
                  ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                  : chatPartner?.is_online
                    ? "online"
                    : chatPartner?.last_seen
                      ? `last seen ${formatDistanceToNow(new Date(chatPartner.last_seen), { addSuffix: true })}`
                      : ""}
              </span>
            </p>
          </div>
        </button>

        <div className="flex items-center gap-0.5">
          <button onClick={() => toast("Voice calls — coming soon")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
            <Phone className="h-4 w-4" />
          </button>
          <button onClick={() => toast("Video calls — coming soon")} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
            <Video className="h-4 w-4" />
          </button>
          <button onClick={() => setActionsOpen(true)} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">
              {cleared_at ? "Chat cleared. New messages will appear here." : "Start your conversation"}
            </p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <motion.div
                key={msg.id}
                id={`msg-${msg.id}`}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div className="relative max-w-[80%]">
                  <div className={cn(
                    "px-3 py-2 text-[14px] leading-relaxed",
                    isMe
                      ? "bg-primary/20 text-foreground rounded-2xl rounded-br-md border border-primary/20"
                      : "glass-panel text-foreground rounded-2xl rounded-bl-md"
                  )}>
                    {!isMe && msg.sender && (
                      <p className="text-[10px] text-neon mb-0.5 font-medium">{msg.sender.display_name}</p>
                    )}
                    {msg.message_type === "image" && msg.media_url && (
                      <a href={msg.media_url} target="_blank" rel="noreferrer">
                        <img src={msg.media_url} alt="" className="rounded-lg max-h-64 object-cover" />
                      </a>
                    )}
                    {msg.message_type === "video" && msg.media_url && (
                      <video src={msg.media_url} controls className="rounded-lg max-h-64" />
                    )}
                    {msg.message_type === "audio" && msg.media_url && (
                      <AudioMessage url={msg.media_url} mine={isMe} />
                    )}
                    {msg.message_type === "file" && msg.media_url && (
                      <a href={msg.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1">
                        <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center"><FileText className="h-4 w-4 text-neon" /></div>
                        <span className="text-xs underline">{msg.content ?? "Download file"}</span>
                      </a>
                    )}
                    {(!msg.message_type || msg.message_type === "text") && msg.content}
                  </div>
                  <div className={cn("flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground px-1", isMe ? "justify-end" : "justify-start")}>
                    <span>{time}</span>
                    {isMe && <CheckCheck className="h-3 w-3 text-accent" />}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attachment menu */}
      <AnimatePresence>
        {attachOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAttachOpen(false)} className="fixed inset-0 z-30 bg-black/40" />
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="absolute left-3 right-3 bottom-20 z-40 glass-panel rounded-2xl border border-glass-border p-3 grid grid-cols-3 gap-2"
            >
              {[
                { icon: ImageIcon, label: "Photo", accept: "image/*" },
                { icon: Film, label: "Video", accept: "video/*" },
                { icon: FileText, label: "Document", accept: "*/*" },
              ].map(opt => (
                <button key={opt.label} onClick={() => { setAcceptType(opt.accept); setAttachOpen(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary/60">
                  <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-neon"><opt.icon className="h-5 w-5" /></div>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-3 py-2 border-t border-border flex-shrink-0 bg-background/80 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        {recording ? (
          <VoiceRecorder onCancel={() => setRecording(false)} onSend={sendVoice} />
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={() => setAttachOpen(v => !v)} disabled={uploading}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground flex-shrink-0 disabled:opacity-50">
              {attachOpen ? <X className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={uploading ? "Uploading..." : "Message..."}
                rows={1}
                disabled={uploading}
                className="w-full rounded-2xl bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none max-h-24 disabled:opacity-60"
              />
            </div>
            {input.trim() ? (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }} onClick={handleSend}
                className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:shadow-[0_0_15px_var(--neon-glow)] transition-all flex-shrink-0">
                <Send className="h-4 w-4" />
              </motion.button>
            ) : (
              <MicButton onClick={() => setRecording(true)} />
            )}
          </div>
        )}
      </div>

      <ChatSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} messages={visibleMessages} onJump={jumpTo} />
      <ChatProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} partner={chatPartner} chatId={chatId} />
      <ChatActionsSheet
        open={actionsOpen} onClose={() => setActionsOpen(false)}
        chatId={chatId} partnerId={chatPartner?.id ?? null} isGroup={!!chatMeta?.is_group}
        onOpenProfile={() => setProfileOpen(true)}
        onSearch={() => setSearchOpen(true)}
      />
    </div>
  );
}
