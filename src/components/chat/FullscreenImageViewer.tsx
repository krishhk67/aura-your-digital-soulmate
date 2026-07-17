import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  src: string | null;
  alt?: string;
  /** Unique per-image hero id for shared element transition (e.g. `avatar-hero-<userId>`). */
  heroId?: string;
  onClose: () => void;
}

/**
 * Premium fullscreen image viewer.
 * - Shared element transition from a source avatar via `heroId`.
 * - Waits for the image to load before running the expansion animation,
 *   so aspect ratio + dimensions are known and the layout never jumps.
 * - Pinch to zoom (two-finger touch), double tap to toggle 1x <-> 2.5x,
 *   drag down (while at 1x) to dismiss.
 */
export function FullscreenImageViewer({ open, src, alt, heroId, onClose }: Props) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [-300, 0, 300], [0.2, 1, 0.2]);

  const [zoomed, setZoomed] = useState(false);
  const [ready, setReady] = useState(false);
  const lastTap = useRef(0);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  // Fully reset all transforms + load state whenever the viewer opens/closes or the image changes.
  // This is critical: without this, transforms from a previous user's image leak into the next one.
  useEffect(() => {
    scale.set(1);
    x.set(0);
    y.set(0);
    setZoomed(false);
    setReady(false);
  }, [open, src, heroId, scale, x, y]);

  const resetToOne = () => {
    animate(scale, 1, { type: "spring", stiffness: 240, damping: 26 });
    animate(x, 0, { type: "spring", stiffness: 240, damping: 26 });
    animate(y, 0, { type: "spring", stiffness: 240, damping: 26 });
    setZoomed(false);
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 260) {
      if (zoomed) resetToOne();
      else {
        animate(scale, 2.5, { type: "spring", stiffness: 240, damping: 26 });
        setZoomed(true);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const dist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        startDist: dist(e.touches[0], e.touches[1]),
        startScale: scale.get(),
      };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const d = dist(e.touches[0], e.touches[1]);
      const next = Math.max(1, Math.min(5, pinchRef.current.startScale * (d / pinchRef.current.startDist)));
      scale.set(next);
      setZoomed(next > 1.05);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (scale.get() < 1.05) resetToOne();
  };

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black backdrop-blur-2xl"
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
          />
          <motion.button
            onClick={onClose}
            className="absolute top-[env(safe-area-inset-top,16px)] right-4 z-20 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1 } }}
            exit={{ opacity: 0 }}
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* Shared element container.
             - `layoutId` gives us the smooth expansion from the source avatar.
             - No `initial/animate` scale here: it would fight the layout transition and
               is the source of the "shrink to tiny circle" glitch on cached avatars. */}
          <motion.div
            key={heroId ?? src}
            layoutId={heroId}
            className="relative touch-none select-none rounded-2xl overflow-hidden"
            style={{ x, y, scale, opacity: ready ? 1 : 0 }}
            drag={!zoomed ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 140 || Math.abs(info.velocity.y) > 700) {
                onClose();
              } else {
                animate(y, 0, { type: "spring", stiffness: 300, damping: 28 });
              }
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={handleTap}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <img
              src={src}
              alt={alt ?? ""}
              draggable={false}
              onLoad={() => setReady(true)}
              className="block max-h-[90vh] max-w-[90vw] object-contain pointer-events-none"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
