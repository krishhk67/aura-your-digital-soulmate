import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * VoicePlayer (AudioMessage)
 *
 * Reuses the existing <audio> playback logic and props/message schema.
 * Rendering is intentionally split into independent layers:
 *   1. Static bubble/background
 *   2. Decorative Wave #1 canvas — RAF loop A only
 *   3. Decorative Wave #2 canvas — RAF loop A only
 *   4. Playback progress overlay — RAF loop B only
 *   5. Glowing progress indicator — RAF loop B only
 * The audio player never redraws, replaces, pauses, or manipulates the wave
 * canvases. It only updates time/progress refs.
 */
interface Props {
  url: string;
  mine?: boolean;
  /** Optional duration hint in milliseconds (used when metadata is missing). */
  durationHintMs?: number;
}

export function AudioMessage({ url, mine, durationHintMs }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveOneRef = useRef<HTMLCanvasElement | null>(null);
  const waveTwoRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const progressDotRef = useRef<HTMLDivElement | null>(null);

  // Refs the playback RAF loop reads without triggering React re-renders.
  const playingRef = useRef(false);
  const progressRatioRef = useRef(0); // 0..1
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
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
      currentTimeRef.current = ct;
      progressRatioRef.current = d > 0 ? Math.min(1, ct / d) : 0;
      setCurrentTime(ct);
    };
    const onPlay = () => { playingRef.current = true; setPlaying(true); };
    const onPause = () => { playingRef.current = false; setPlaying(false); };
    const onEnded = () => {
      playingRef.current = false;
      setPlaying(false);
      try { a.currentTime = 0; } catch {}
      currentTimeRef.current = 0;
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

  // ─── 2. LOOP A: DECORATIVE WAVE MOTION ONLY ──────────────────────
  // Runs forever. Never reads playback state, progress, duration, or timers.
  useEffect(() => {
    const waveOne = waveOneRef.current;
    const waveTwo = waveTwoRef.current;
    if (!waveOne || !waveTwo) return;

    const ctxOne = waveOne.getContext("2d");
    const ctxTwo = waveTwo.getContext("2d");
    if (!ctxOne || !ctxTwo) return;

    let raf = 0;
    let phaseOne = 0;
    let phaseTwo = 1.7;
    let last = performance.now();

    const resize = () => {
      const parent = waveOne.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      for (const [canvas, ctx] of [[waveOne, ctxOne], [waveTwo, ctxTwo]] as const) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (waveOne.parentElement) ro.observe(waveOne.parentElement);

    const drawWave = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      phase: number,
      alpha: number,
      lineWidth: number,
      offset: number,
    ) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);
      const mutedStrong = mine ? "rgba(255,255,255,0.34)" : "rgba(150,150,164,0.55)";
      const mutedSoft = mine ? "rgba(255,255,255,0.18)" : "rgba(150,150,164,0.30)";

      ctx.save();
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const nx = x / Math.max(w, 1);
        const y =
          mid +
          Math.sin(nx * 6.1 + phase + offset) * (h * 0.20) +
          Math.sin(nx * 12.4 - phase * 0.72 + offset * 0.6) * (h * 0.055);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = lineWidth > 1.5 ? mutedStrong : mutedSoft;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    };

    const draw = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      phaseOne += dt * 0.00145;
      phaseTwo -= dt * 0.00105;

      drawWave(ctxTwo, waveTwo, phaseTwo, 0.86, 1.35, 1.1);
      drawWave(ctxOne, waveOne, phaseOne, 1, 1.85, 0);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mine]);

  // ─── 3. LOOP B: PLAYBACK PROGRESS ONLY ──────────────────────────
  // Reads currentTime/duration and updates only overlay transforms + timer.
  // It never touches the decorative wave canvases.
  useEffect(() => {
    let raf = 0;
    let lastRenderedSecond = -1;

    const renderProgress = () => {
      const fill = progressFillRef.current;
      const dot = progressDotRef.current;
      const track = trackRef.current;
      const a = audioRef.current;

      if (a && !draggingRef.current) {
        const d = durationRef.current || (isFinite(a.duration) ? a.duration : 0);
        const ct = a.currentTime || 0;
        currentTimeRef.current = ct;
        progressRatioRef.current = d > 0 ? Math.max(0, Math.min(1, ct / d)) : 0;

        const wholeSecond = Math.floor(ct);
        if (wholeSecond !== lastRenderedSecond) {
          lastRenderedSecond = wholeSecond;
          setCurrentTime(ct);
        }
      }

      const progress = Math.max(0, Math.min(1, progressRatioRef.current));
      if (fill) fill.style.transform = `scaleX(${progress})`;
      if (dot && track) {
        const x = progress * track.clientWidth;
        dot.style.transform = `translate3d(${x}px, -50%, 0)`;
      }

      raf = requestAnimationFrame(renderProgress);
    };

    raf = requestAnimationFrame(renderProgress);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── 4. INTERACTION ─────────────────────────────────────────────
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
    currentTimeRef.current = nt;
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
          className="relative w-full h-10 cursor-pointer touch-none select-none overflow-hidden rounded-full"
        >
          {/* Layer 1: static voice bubble */}
          <div
            aria-hidden
            className={cn(
              "absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 rounded-full border backdrop-blur-sm",
              mine
                ? "border-primary-foreground/15 bg-primary-foreground/8"
                : "border-border/50 bg-background/45",
            )}
          />

          {/* Layer 2 + 3: purely decorative waves. Audio never manipulates these. */}
          <canvas ref={waveTwoRef} aria-hidden className="absolute inset-0 h-full w-full" />
          <canvas ref={waveOneRef} aria-hidden className="absolute inset-0 h-full w-full" />

          {/* Layer 4: independent playback overlay. No shared paths/canvases. */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded-full">
            <div
              ref={progressFillRef}
              aria-hidden
              className={cn(
                "h-full w-full origin-left rounded-full will-change-transform",
                mine
                  ? "bg-gradient-to-r from-primary-foreground/28 via-primary-foreground/18 to-primary-foreground/5"
                  : "bg-gradient-to-r from-primary/26 via-primary/16 to-primary/4",
              )}
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          {/* Layer 5: independent glowing progress indicator. */}
          <div
            ref={progressDotRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 rounded-full will-change-transform",
              mine ? "bg-primary-foreground shadow-[0_0_16px_rgba(255,255,255,0.55)]" : "bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.65)]",
            )}
            style={{ transform: "translate3d(0px, -50%, 0)" }}
          >
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-ping",
                mine ? "bg-primary-foreground/35" : "bg-primary/35",
              )}
            />
          </div>
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
