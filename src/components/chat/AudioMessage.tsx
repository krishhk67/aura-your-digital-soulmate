import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  mine?: boolean;
  /** Optional duration hint in milliseconds (e.g. stored at record time). Used when the file lacks metadata duration. */
  durationHintMs?: number;
}

export function AudioMessage({ url, mine, durationHintMs }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const progressRef = useRef(0);
  const progressSecondsRef = useRef(0);
  const playingRef = useRef(false);
  const durationRef = useRef(0);
  const draggingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Deterministic per-message wave signature so bars aren't identical everywhere
  const sigRef = useRef<number[]>(
    (() => {
      const seed = Math.floor(Math.random() * 1000);
      return Array.from({ length: 8 }, (_, i) => 0.4 + Math.abs(Math.sin(seed * (i + 1) * 0.37)) * 0.6);
    })(),
  );

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let fixingDuration = false;
    const applyDuration = (d: number) => {
      if (isFinite(d) && d > 0) setDuration(d);
      else if (durationHintMs && durationHintMs > 0) setDuration(durationHintMs / 1000);
    };
    const onTime = () => {
      if (draggingRef.current) return;
      const nextProgress = a.currentTime;
      progressSecondsRef.current = nextProgress;
      progressRef.current = durationRef.current ? nextProgress / durationRef.current : 0;
      setProgress(nextProgress);
    };
    const onLoad = () => {
      // MediaRecorder webm often reports Infinity for duration. Trigger the seek trick to force the browser to compute it.
      if (!isFinite(a.duration) || a.duration === 0) {
        fixingDuration = true;
        try { a.currentTime = 1e6; } catch {}
      } else {
        applyDuration(a.duration);
      }
    };
    const onDurationChange = () => {
      if (fixingDuration && isFinite(a.duration) && a.duration > 0) {
        fixingDuration = false;
        applyDuration(a.duration);
        try { a.currentTime = 0; } catch {}
      } else if (!fixingDuration) {
        applyDuration(a.duration);
      }
    };
    const onEnd = () => {
      setPlaying(false);
      playingRef.current = false;
      setProgress(0);
      progressSecondsRef.current = 0;
      progressRef.current = 0;
    };
    const onPlay = () => { setPlaying(true); playingRef.current = true; };
    const onPause = () => { setPlaying(false); playingRef.current = false; };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    // Seed from hint immediately so UI never shows 0:00 for a known-length note.
    if (durationHintMs && durationHintMs > 0) setDuration(durationHintMs / 1000);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [durationHintMs, url]);

  useEffect(() => {
    durationRef.current = duration;
    progressRef.current = duration ? progressSecondsRef.current / duration : 0;
  }, [duration]);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  useEffect(() => {
    progressSecondsRef.current = progress;
    progressRef.current = durationRef.current ? progress / durationRef.current : 0;
  }, [progress, duration]);

  // Canvas render loop — liquid dual-wave visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastT = performance.now();
    let lastTimeLabelT = 0;

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
    const primaryLight = primary;

    const render = (t: number) => {
      const dt = Math.min(64, t - lastT);
      lastT = t;

      // Animation clock is intentionally independent from audio currentTime.
      // The waves stay alive during idle, playback, pause, seek, and resume.
      const speed = playingRef.current ? 0.0024 : 0.0009;
      phaseRef.current += dt * speed;

      const audio = audioRef.current;
      const totalDuration = durationRef.current;
      if (audio && !draggingRef.current && totalDuration > 0) {
        const nextProgress = Math.max(0, Math.min(totalDuration, audio.currentTime || 0));
        progressSecondsRef.current = nextProgress;
        progressRef.current = nextProgress / totalDuration;

        if (t - lastTimeLabelT > 120 || !playingRef.current) {
          lastTimeLabelT = t;
          setProgress((prev) => (Math.abs(prev - nextProgress) > 0.035 ? nextProgress : prev));
        }
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      const progress = Math.max(0, Math.min(1, progressRef.current));
      const playedX = progress * w;

      // Dual liquid waves — synchronized primary + counter-phase secondary
      const mutedColor = mine ? "rgba(255,255,255,0.32)" : "rgba(148,148,160,0.5)";
      const mutedColorSoft = mine ? "rgba(255,255,255,0.18)" : "rgba(148,148,160,0.28)";

      const waveY = (nx: number, variant: 0 | 1) =>
        variant === 0
          ? midY +
            Math.sin(nx * 6.2 + phaseRef.current * 2) * (h * 0.22) +
            Math.sin(nx * 11.4 - phaseRef.current * 1.2) * (h * 0.07)
          : midY +
            Math.sin(nx * 5.4 - phaseRef.current * 1.6 + 1.1) * (h * 0.16) +
            Math.sin(nx * 9.8 + phaseRef.current * 1.0 + 0.4) * (h * 0.05);

      const drawWave = (opts: { variant: 0 | 1; stroke: string | CanvasGradient; alpha: number; lineWidth: number; clipLeft?: number; clipRight?: number; shadow?: string }) => {
        ctx.save();
        if (opts.clipLeft !== undefined || opts.clipRight !== undefined) {
          ctx.beginPath();
          ctx.rect(opts.clipLeft ?? 0, 0, (opts.clipRight ?? w) - (opts.clipLeft ?? 0), h);
          ctx.clip();
        }
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = waveY(x / w, opts.variant);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = opts.alpha;
        ctx.strokeStyle = opts.stroke;
        ctx.lineWidth = opts.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = 6; }
        ctx.stroke();
        ctx.restore();
      };

      // Unplayed portion — two muted waves
      drawWave({ variant: 1, stroke: mutedColorSoft, alpha: 1, lineWidth: 1.4, clipLeft: playedX });
      drawWave({ variant: 0, stroke: mutedColor, alpha: 1, lineWidth: 1.8, clipLeft: playedX });

      // Played portion — accent gradient with soft glow, both waves
      if (playedX > 0.5) {
        const grad = ctx.createLinearGradient(0, 0, playedX, 0);
        grad.addColorStop(0, primary);
        grad.addColorStop(1, primaryLight);
        drawWave({ variant: 1, stroke: primary, alpha: 0.55, lineWidth: 1.5, clipRight: playedX });
        drawWave({ variant: 0, stroke: grad, alpha: 1, lineWidth: 2, clipRight: playedX, shadow: primary });
      }

      // Glowing progress dot pinned to the primary wave, with gentle pulse
      if (durationRef.current > 0) {
        const y = waveY(progress, 0);
        const pulse = 1 + Math.sin(t * 0.006) * 0.18;
        ctx.save();
        ctx.globalAlpha = 0.3;
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

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [mine]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  };

  const seekFromEvent = useCallback((clientX: number) => {
    const el = containerRef.current;
    const a = audioRef.current;
    if (!el || !a || !duration) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    const nextProgress = pct * duration;
    progressSecondsRef.current = nextProgress;
    progressRef.current = pct;
    setProgress(nextProgress);
  }, [duration]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    seekFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    seekFromEvent(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex items-center gap-3 min-w-[210px] max-w-[280px]")}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "relative h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          mine ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary/20 text-primary",
        )}
      >
        {playing && (
          <motion.span
            className={cn("absolute inset-0 rounded-full", mine ? "bg-primary-foreground/20" : "bg-primary/25")}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <motion.div
          key={playing ? "pause" : "play"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </motion.div>
      </motion.button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative w-full h-9 cursor-pointer touch-none select-none"
        >
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
        <span className={cn("text-[10px] font-mono tabular-nums", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {fmt(progress)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
