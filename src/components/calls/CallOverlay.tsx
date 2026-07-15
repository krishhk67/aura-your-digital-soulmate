import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, RefreshCw, PhoneIncoming } from "lucide-react";
import { useCalls } from "@/hooks/useCalls";

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function PeerAvatar({ url, name, size = 96 }: { url: string | null | undefined; name: string | null | undefined; size?: number }) {
  return (
    <div className="rounded-full overflow-hidden bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center border-2 border-primary/40 shadow-[0_0_40px_var(--neon-glow)]"
      style={{ width: size, height: size }}>
      {url
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : <span className="font-display text-3xl font-bold text-primary-foreground/90">{name?.[0]?.toUpperCase() ?? "?"}</span>}
    </div>
  );
}

export function CallOverlay() {
  const { session, incoming, acceptCall, rejectCall, endCall, toggleMic, toggleCamera, toggleSpeaker, switchCamera } = useCalls();

  // ---- Incoming ----
  if (incoming && !session) {
    const { call, peer } = incoming;
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-background/95 backdrop-blur-2xl px-6 py-10"
        style={{ paddingTop: "env(safe-area-inset-top, 40px)", paddingBottom: "env(safe-area-inset-bottom, 40px)" }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{ background: "radial-gradient(ellipse at top, var(--neon-glow), transparent 60%)" }} />

        <div className="flex flex-col items-center gap-4 mt-16">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <PeerAvatar url={peer?.avatar_url} name={peer?.display_name} size={140} />
          </motion.div>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-widest text-neon flex items-center justify-center gap-1.5">
              <PhoneIncoming className="h-3 w-3" />
              Incoming {call.call_type} call
            </div>
            <h2 className="font-display text-2xl font-bold mt-2">{peer?.display_name ?? peer?.username ?? "Unknown"}</h2>
          </div>
        </div>

        <div className="flex items-center gap-16">
          <button onClick={() => void rejectCall()}
            className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
            <PhoneOff className="h-6 w-6" />
          </button>
          <motion.button
            animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            onClick={() => void acceptCall()}
            className="h-16 w-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-[0_0_40px_var(--neon-glow)]">
            <Phone className="h-6 w-6" />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  if (!session) return null;
  return <ActiveCallView />;
}

function ActiveCallView() {
  const { session, endCall, toggleMic, toggleCamera, toggleSpeaker, switchCamera } = useCalls();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session) return;
    if (remoteVideoRef.current && session.remoteStream) remoteVideoRef.current.srcObject = session.remoteStream;
    if (localVideoRef.current && session.localStream) localVideoRef.current.srcObject = session.localStream;
    if (remoteAudioRef.current && session.remoteStream) remoteAudioRef.current.srcObject = session.remoteStream;
  }, [session?.remoteStream, session?.localStream]);

  useEffect(() => {
    if (!session?.startedAt) return;
    const iv = window.setInterval(() => setElapsed(Math.floor((Date.now() - (session.startedAt ?? Date.now())) / 1000)), 500);
    return () => clearInterval(iv);
  }, [session?.startedAt]);

  if (!session) return null;

  const isVideo = session.call.call_type === "video";
  const connLabel = session.connectionState === "connected"
    ? (session.startedAt ? fmtDuration(elapsed) : "Connected")
    : session.connectionState === "connecting" || session.connectionState === "new"
      ? (session.isCaller ? "Calling…" : "Connecting…")
      : session.connectionState === "disconnected" ? "Reconnecting…" : session.connectionState;

  const qualityDot = session.quality === "excellent" ? "bg-emerald-400" : session.quality === "good" ? "bg-yellow-400" : session.quality === "poor" ? "bg-red-400" : "bg-neon";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Remote video (video call) or ambient gradient (voice) */}
      {isVideo ? (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover bg-black" />
      ) : (
        <>
          <div className="absolute inset-0 -z-10"
            style={{ background: "radial-gradient(ellipse at 30% 20%, var(--neon-glow), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.6 0.2 300 / 40%), transparent 65%)" }} />
          <audio ref={remoteAudioRef} autoPlay />
        </>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pt-[env(safe-area-inset-top,12px)] z-10">
        <div className="flex items-center gap-2 glass-panel rounded-full px-3 py-1.5 text-[11px]">
          <span className={`h-1.5 w-1.5 rounded-full ${qualityDot} ${session.connectionState === "connected" ? "" : "animate-pulse"}`} />
          <span className="uppercase tracking-wider">{connLabel}</span>
        </div>
        {isVideo && (
          <button onClick={() => void switchCamera()} className="glass-panel rounded-full h-9 w-9 flex items-center justify-center">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Voice-call center content */}
      {!isVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <PeerAvatar url={session.peer?.avatar_url} name={session.peer?.display_name} size={160} />
          <h2 className="font-display text-3xl font-bold">{session.peer?.display_name ?? session.peer?.username ?? "Unknown"}</h2>
          <div className="text-sm text-muted-foreground">Voice Call</div>
        </div>
      )}

      {/* Local preview (video) */}
      {isVideo && (
        <motion.div drag dragMomentum={false}
          className="absolute top-16 right-3 w-28 h-40 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-2xl bg-black z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" style={{ transform: session.facing === "user" ? "scaleX(-1)" : undefined }} />
          {session.cameraOff && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-muted-foreground">Off</div>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] z-10">
        <div className="glass-panel rounded-3xl border border-glass-border p-4 flex items-center justify-around gap-2 max-w-md mx-auto">
          <ControlButton active={session.micMuted} onClick={toggleMic}
            iconOn={<Mic className="h-5 w-5" />} iconOff={<MicOff className="h-5 w-5" />} label="Mic" />
          {isVideo && (
            <ControlButton active={session.cameraOff} onClick={toggleCamera}
              iconOn={<Video className="h-5 w-5" />} iconOff={<VideoOff className="h-5 w-5" />} label="Camera" />
          )}
          <ControlButton active={!session.speakerOn} onClick={toggleSpeaker}
            iconOn={<Volume2 className="h-5 w-5" />} iconOff={<VolumeX className="h-5 w-5" />} label="Speaker" />
          <button onClick={() => void endCall()}
            className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ControlButton({ active, onClick, iconOn, iconOff, label }: {
  active: boolean; onClick: () => void; iconOn: React.ReactNode; iconOff: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`h-12 w-12 rounded-full flex flex-col items-center justify-center transition-colors ${
        active ? "bg-destructive/20 text-destructive" : "bg-secondary/60 text-foreground"
      }`}
      aria-label={label}>
      {active ? iconOff : iconOn}
    </button>
  );
}
