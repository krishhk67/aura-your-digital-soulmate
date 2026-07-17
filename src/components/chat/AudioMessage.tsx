import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * VoicePlayer (AudioMessage)
 *
 * Fully rebuilt UI. Reuses the existing <audio> element for playback and the
 * same props/message schema as before. Three fully independent systems:
 *   1. Wave animation loop  → canvas RAF driven by its own phase clock
 *   2. Playback progress    → derived from <audio>.currentTime via events
 *   3. Audio state          → play/pause/ended listeners
 * None of them can stop, freeze, or replace the others.
 */
interface Props {
  url: string;
  mine?: boolean;
  /** Optional duration hint in milliseconds (used when metadata is missing). */
  durationHintMs?: number;
}

export function AudioMessage({ url, mine, durationHintMs }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Refs the RAF loop reads without triggering React re-renders
  const playingRef = useRef(false);
  const progressRatioRef = useRef(0); // 0..1
  const durationRef = useRef(0);
  const draggingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ─── 1. AUDIO STATE ─────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    let fixing = false;
    const applyDuration = (d: number) => {
      if (isFinite(d) && d > 0) {
        durationRef.current = d;
        setDuration(d);
      } else if (durationHintMs && durationHintMs > 0) {
        const dh = durationHintMs / 1000;
        durationRef.current = dh;
        setDuration(dh);
      }
    };

    const onLoaded = () => {
      if (!isFinite(a.duration) || a.duration === 0) {
        // MediaRecorder webm workaround: seek very far to force real duration.
        fixing = true;
        try { a.currentTime = 1e6; } catch {}
      } else {
        applyDuration(a.duration);
      }
    };
    const onDurationChange = () => {
      if (fixing && isFinite(a.duration) && a.duration > 0) {
        fixing = false;
        applyDuration(a.duration);
        try { a.currentTime = 0; } catch {}
      } else if (!fixing) {
        applyDuration(a.duration);
      }
    };
    const onTime = () => {
      if (draggingRef.current) return;
      const d = durationRef.current;
      const ct = a.currentTime || 0;
      progressRatioRef.current = d > 0 ? Math.min(1, ct / d) : 0;
      setCurrentTime(ct);
    };
    const onPlay = () => { playingRef.current = true; setPlaying(true); };
    const onPause = () => { playingRef.current = false; setPlaying(false); };
    const onEnded = () => {
      playingRef.current = false;
      setPlaying(false);
      try { a.currentTime = 0; } catch {}
      progressRatioRef.current = 0;
      setCurrentTime(0);
    };

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    if (durationHintMs && durationHintMs > 0 && !durationRef.current) {
      durationRef.current = durationHintMs / 1000;
      setDuration(durationHintMs / 1000);
    }

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [url, durationHintMs]);

  // ─── 2. WAVE ANIMATION LOOP ─────────────────────────────────────
  // Runs forever. Independent from audio state. Reads progressRatioRef so the
  // played/unplayed colour split follows playback without ever stopping.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let phase = 0;
    let last = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const styles = getComputedStyle(document.documentElement);
    const primary = `hsl(${styles.getPropertyValue("--primary").trim() || "160 84% 45%"})`;

    const draw = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      // Wave keeps flowing at all times — a touch faster while playing.
      phase += dt * (playingRef.current ? 0.0022 : 0.0009);

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      const progress = Math.max(0, Math.min(1, progressRatioRef.current));
      const playedX = progress * w;

      const yA = (nx: number) =>
        mid +
        Math.sin(nx * 6.2 + phase * 2.0) * (h * 0.24) +
        Math.sin(nx * 11.4 - phase * 1.2) * (h * 0.07);
      const yB = (nx: number) =>
        mid +
        Math.sin(nx * 5.4 - phase * 1.6 + 1.1) * (h * 0.17) +
        Math.sin(nx * 9.8 + phase * 1.0 + 0.4) * (h * 0.05);

      const stroke = (
        fn: (nx: number) => number,
        color: string | CanvasGradient,
        lineWidth: number,
        alpha: number,
        clip?: { left?: number; right?: number },
        glow?: string,
      ) => {
        ctx.save();
        if (clip) {
          const l = clip.left ?? 0;
          const r = clip.right ?? w;
          ctx.beginPath();
          ctx.rect(l, 0, r - l, h);
          ctx.clip();
        }
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = fn(x / w);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 6; }
        ctx.stroke();
        ctx.restore();
      };

      const mutedStrong = mine ? "rgba(255,255,255,0.34)" : "rgba(150,150,164,0.55)";
      const mutedSoft = mine ? "rgba(255,255,255,0.18)" : "rgba(150,150,164,0.3)";

      // Unplayed dual wave (always visible along the full track)
      stroke(yB, mutedSoft, 1.4, 1, { left: playedX });
      stroke(yA, mutedStrong, 1.8, 1, { left: playedX });

      // Played dual wave in accent (progress overlay)
      if (playedX > 0.5) {
        const grad = ctx.createLinearGradient(0, 0, playedX, 0);
        grad.addColorStop(0, primary);
        grad.addColorStop(1, primary);
        stroke(yB, primary, 1.5, 0.55, { right: playedX });
        stroke(yA, grad, 2, 1, { right: playedX }, primary);
      }

      // Glowing playhead — sits on top, pulses gently
      if (durationRef.current > 0) {
        const y = yA(progress);
        const pulse = 1 + Math.sin(t * 0.006) * 0.2;
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(playedX, y, 6.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = primary;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(playedX, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mine]);

  // ─── 3. INTERACTION ─────────────────────────────────────────────
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playingRef.current) a.pause();
    else a.play().catch(() => {});
  };

  const seekTo = useCallback((clientX: number) => {
    const el = trackRef.current;
    const a = audioRef.current;
    const d = durationRef.current;
    if (!el || !a || !d) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const nt = pct * d;
    try { a.currentTime = nt; } catch {}
    progressRatioRef.current = pct;
    setCurrentTime(nt);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    seekTo(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    seekTo(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[210px] max-w-[280px]">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play / Pause button with ripple */}
      <motion.button
        type="button"
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "relative h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-colors",
          mine
            ? "bg-primary-foreground/25 text-primary-foreground shadow-black/20"
            : "bg-primary/20 text-primary shadow-primary/20",
        )}
      >
        {playing && (
          <motion.span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full",
              mine ? "bg-primary-foreground/25" : "bg-primary/30",
            )}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={playing ? "pause" : "play"}
            initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
            transition={{ duration: 0.16 }}
            className="flex"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Waveform + timestamp */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative w-full h-10 cursor-pointer touch-none select-none"
        >
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums leading-none",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
