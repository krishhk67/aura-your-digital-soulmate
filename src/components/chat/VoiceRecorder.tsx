import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, X, Send } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onCancel: () => void;
  onSend: (blob: Blob, durationMs: number) => Promise<void> | void;
}

export function VoiceRecorder({ onCancel, onSend }: VoiceRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(28).fill(0.15));
  const [sending, setSending] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const mr = new MediaRecorder(stream, { mimeType: pickMime() });
        recorderRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
        mr.start(100);
        startedAtRef.current = Date.now();

        // Waveform analysis
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          const lvl = Math.min(1, rms * 3 + 0.1);
          setLevels(prev => [...prev.slice(1), lvl]);
          setElapsed(Date.now() - startedAtRef.current);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        toast.error("Microphone access denied");
        onCancel();
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach(t => t.stop());
      try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch {}
    };
  }, [onCancel]);

  const stopAndSend = async () => {
    const mr = recorderRef.current;
    if (!mr || sending) return;
    setSending(true);
    const finalize = new Promise<Blob>((resolve) => {
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }));
    });
    try { mr.stop(); } catch {}
    const blob = await finalize;
    const dur = Date.now() - startedAtRef.current;
    if (dur < 500) { toast.error("Hold longer to record"); onCancel(); return; }
    await onSend(blob, dur);
  };

  const mm = Math.floor(elapsed / 60000).toString().padStart(2, "0");
  const ss = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 w-full glass-panel rounded-2xl px-3 py-2 border border-primary/30"
    >
      <button onClick={onCancel} className="h-9 w-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1 flex-1 h-8 overflow-hidden">
        {levels.map((l, i) => (
          <div key={i} className="flex-1 rounded-full bg-primary/70 transition-[height] duration-75" style={{ height: `${Math.max(8, l * 100)}%` }} />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono text-neon">
        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        {mm}:{ss}
      </div>
      <button onClick={stopAndSend} disabled={sending} className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50">
        <Send className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function MicButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onClick}
      className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground flex-shrink-0">
      <Mic className="h-5 w-5" />
    </motion.button>
  );
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const m of candidates) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
