import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmoothAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
  imgClassName?: string;
  ringClassName?: string;
}

/**
 * Premium avatar: preloads the next image, keeps the previous one visible,
 * then crossfades. Shows a shimmer skeleton only when there's nothing at all.
 * Circular crop, no layout shift, no black flash.
 */
export function SmoothAvatar({
  src,
  alt = "",
  size = 96,
  fallback,
  className,
  imgClassName,
  ringClassName,
}: SmoothAvatarProps) {
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!src);
  const lastRequested = useRef<string | null>(null);

  useEffect(() => {
    const next = src ?? null;
    if (next === current) {
      setLoading(false);
      return;
    }
    if (!next) {
      // no new src - clear only if we had nothing (avoid flash)
      lastRequested.current = null;
      setCurrent(null);
      setLoading(false);
      return;
    }
    if (lastRequested.current === next) return;
    lastRequested.current = next;

    let cancelled = false;
    setLoading(true);
    const img = new Image();
    img.decoding = "async";
    const commit = () => {
      if (cancelled) return;
      setCurrent(next);
      setLoading(false);
    };
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(commit).catch(commit);
      } else {
        commit();
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      // keep previous image; just stop the loader
      setLoading(false);
    };
    img.src = next;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, current]);

  const style = { width: size, height: size };

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-white/[0.04]",
        ringClassName,
        className,
      )}
      style={style}
    >
      <AnimatePresence initial={false}>
        {current ? (
          <motion.img
            key={current}
            src={current}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn("absolute inset-0 h-full w-full object-cover rounded-full", imgClassName)}
            draggable={false}
            decoding="async"
          />
        ) : (
          !loading && fallback && (
            <motion.div
              key="fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center rounded-full"
            >
              {fallback}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {loading && !current && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-white/[0.02]" />
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}
    </div>
  );
}
