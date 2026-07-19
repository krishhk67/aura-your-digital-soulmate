import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAnonymousSpace, useAnonymousSpaceActions, type AnonParticipant } from "@/hooks/useAnonymousSpace";
import { useAuth } from "@/hooks/useAuth";
import { IdentityPicker } from "./IdentityPicker";
import { EnterTransition } from "./EnterTransition";

interface Props {
  spaceId: string;
  onExit: () => void;
}

/** Deterministic accent hex from a participant id, restricted to a small elegant palette. */
function aliasAccent(id: string) {
  const palette = ["#B4A7FF", "#8FE3FF", "#D3B7FF", "#A6F0D8", "#F5D4E7", "#FFC9A6"];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export function AnonymousSpaceView({ spaceId, onExit }: Props) {
  const { user } = useAuth();
  const { join, leave } = useAnonymousSpaceActions();
  const { space, participants, messages, me, loading, destroyed, send } = useAnonymousSpace(spaceId);

  const [phase, setPhase] = useState<"picking" | "transition" | "welcome" | "chat">("picking");
  const [joining, setJoining] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Track whether we actually joined so unmount cleanup doesn't destroy a space
  // we never entered (fixes StrictMode double-mount + quick-close races).
  const joinedRef = useRef(false);

  // If already joined (rejoining after refresh), skip identity picker.
  useEffect(() => {
    if (loading) return;
    if (me) {
      joinedRef.current = true;
      if (phase === "picking") setPhase("chat");
    }
  }, [loading, me, phase]);

  // Destroyed → show a lightweight in-view farewell card, then auto-exit.
  useEffect(() => {
    if (!destroyed) return;
    const t = window.setTimeout(() => onExit(), 2200);
    return () => window.clearTimeout(t);
  }, [destroyed, onExit]);

  useEffect(() => {
    if (phase === "welcome") {
      const t = window.setTimeout(() => setPhase("chat"), 4200);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Leave on unmount ONLY if we actually joined. The server also guards this,
  // but keeping the client honest avoids needless RPC calls.
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  useEffect(() => () => {
    if (joinedRef.current) void leaveRef.current(spaceId);
  }, [spaceId]);

  const handlePickIdentity = async (alias: string | null) => {
    setJoining(true);
    const { error } = await join(spaceId, alias ?? undefined);
    setJoining(false);
    if (error) return toast.error(error.message);
    joinedRef.current = true;
    try { navigator.vibrate?.([10, 30, 10]); } catch { /* noop */ }
    setPhase("transition");
  };

  const handleTransitionDone = () => setPhase("welcome");

  const handleLeave = async () => {
    try { navigator.vibrate?.(15); } catch { /* noop */ }
    if (joinedRef.current) {
      await leave(spaceId);
      joinedRef.current = false;
    }
    onExit();
  };


  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const { error } = await send(text);
    if (error) { toast.error(error.message); setInput(text); }
  };

  const participantMap = useMemo(() => {
    const m = new Map<string, AnonParticipant>();
    participants.forEach(p => m.set(p.id, p));
    return m;
  }, [participants]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-[#0B0B0D] flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Ambient depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />
      </div>

      {/* Destroyed farewell — lightweight, auto-dismissing, non-blocking */}
      <AnimatePresence>
        {destroyed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-[80] bg-[#0B0B0D]/95 backdrop-blur-md flex items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-sm"
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Space ended</p>
              <h2 className="mt-3 text-xl font-semibold text-white">Everyone has left</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/55">
                This anonymous space has been permanently destroyed. Nothing was saved.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: identity picker */}
      {phase === "picking" && !loading && !me && (
        <div className="flex-1 relative flex flex-col items-center justify-center p-6">
          <IdentityPicker onPick={handlePickIdentity} busy={joining} />
          <button onClick={onExit} className="absolute top-4 right-4 h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Phase: transition */}
      <AnimatePresence>
        {phase === "transition" && <EnterTransition onDone={handleTransitionDone} />}
      </AnimatePresence>

      {/* Phase: welcome overlay */}
      <AnimatePresence>
        {phase === "welcome" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[75] bg-[#0B0B0D]/95 backdrop-blur-sm flex items-center justify-center p-8 text-center"
            onClick={() => setPhase("chat")}
          >
            <div className="max-w-sm">
              <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                className="text-[10px] uppercase tracking-[0.4em] text-white/40">Welcome</motion.p>
              <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                className="mt-2 text-2xl font-semibold text-white leading-snug">
                Welcome to Anonymous Space
              </motion.h2>
              <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-4 text-[13.5px] leading-relaxed text-white/60">
                Your identity has been concealed. Nothing said here can ever be linked back to your profile.
              </motion.p>
              <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
                className="mt-3 text-[13.5px] leading-relaxed text-white/60">
                When everyone leaves, this space and everything inside it will be permanently erased.
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 2.4 }}
                className="mt-8 text-[11px] text-white/40">Tap to continue</motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: chat */}
      {phase === "chat" && me && space && (
        <>
          {/* Header */}
          <div className="relative flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <button onClick={handleLeave} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/5 text-white/70">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Anonymous Space</p>
              <h1 className="text-[15px] font-medium text-white truncate">{space.title ?? "Untitled space"}</h1>
            </div>
            <button onClick={() => setShowParticipants(v => !v)}
              className="flex items-center gap-1.5 h-9 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-white/20">
              <Users className="h-3.5 w-3.5" /> {participants.length}
            </button>
          </div>

          {/* Participants sheet */}
          <AnimatePresence>
            {showParticipants && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/5 bg-[#141417]">
                <div className="p-3 flex flex-wrap gap-1.5">
                  {participants.map(p => (
                    <span key={p.id} className="px-2.5 py-1 rounded-full text-[11px] border border-white/10 text-white/70"
                      style={{ color: aliasAccent(p.id) }}>
                      {p.alias}{p.user_id === user?.id ? " (you)" : ""}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 relative">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-white/40 tracking-wide">Silence. Say something.</p>
              </div>
            ) : messages.map(msg => {
              const p = participantMap.get(msg.sender_participant_id);
              const alias = p?.alias ?? "unknown";
              const mine = p?.user_id === user?.id;
              const accent = aliasAccent(msg.sender_participant_id);
              return (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <p className="text-[10.5px] tracking-wide mb-1 px-1" style={{ color: accent }}>
                    {alias}{mine ? " · you" : ""}
                  </p>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed tracking-[0.005em] ${
                    mine
                      ? "bg-white/10 text-white border border-white/10"
                      : "bg-[#1C1C20] text-white/95 border border-white/5"
                  }`}>
                    <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="px-3 py-3 border-t border-white/5 bg-[#0F0F13]"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 12px) + 8px)" }}>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  placeholder={`Send as ${me.alias}...`}
                  rows={1}
                  className="w-full rounded-2xl bg-[#1C1C20] border border-white/5 px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none max-h-28"
                />
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim()}
                className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-40">
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
