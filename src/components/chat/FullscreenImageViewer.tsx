import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  src: string | null;
  alt?: string;
  onClose: () => void;
}

/**
 * Premium fullscreen image viewer.
 * - Pinch to zoom (two-finger touch).
 * - Double tap to toggle 1x <-> 2.5x zoom around tap point.
 * - Drag down (while at 1x) to dismiss with a spring animation.
 */
export function FullscreenImageViewer({ open, src, alt, onClose }: Props) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [-300, 0, 300], [0.2, 1, 0.2]);

  const [zoomed, setZoomed] = useState(false);
  const lastTap = useRef(0);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  useEffect(() => {
    if (!open) {
      scale.set(1);
      x.set(0);
      y.set(0);
      setZoomed(false);
    }
  }, [open, scale, x, y]);

  const resetToOne = () => {
    animate(scale, 1, { type: "spring", stiffness: 240, damping: 26 });
    animate(x, 0, { type: "spring", stiffness: 240, damping: 26 });
    animate(y, 0, { type: "spring", stiffness: 240, damping: 26 });
    setZoomed(false);
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 260) {
      // double tap
      if (zoomed) {
        resetToOne();
      } else {
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
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black"
            style={{ opacity: backdropOpacity }}
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

          <motion.div
            className="relative touch-none select-none"
            style={{ x, y, scale }}
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            layoutId="avatar-hero"
          >
            <img
              src={src}
              alt={alt ?? ""}
              draggable={false}
              className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg pointer-events-none"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
