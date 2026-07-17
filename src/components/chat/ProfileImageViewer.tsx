import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface Props {
  open: boolean;
  src: string | null;
  alt?: string;
  /** Unique per-profile hero id, e.g. `avatar-hero-<userId>`. */
  heroId?: string;
  userId?: string | null;
  onClose: () => void;
}

type LoadState = "idle" | "loading" | "loaded" | "error";

function sanitizeAvatarUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith("supabase.co")) {
      return `https://<backend-storage>${parsed.pathname}${parsed.search}`;
    }
    return url;
  } catch {
    return url;
  }
}

function storagePathFromUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/avatars/";
    const index = parsed.pathname.indexOf(marker);
    return index >= 0 ? parsed.pathname.slice(index + marker.length) : null;
  } catch {
    return null;
  }
}

function logViewer(event: string, payload: Record<string, unknown>) {
  console.info("[Aurix ProfileImageViewer]", { event, component: "ProfileImageViewer", ...payload });
}

/**
 * Single fullscreen profile image viewer used by profile previews.
 * It preloads the exact preview URL first, verifies natural dimensions,
 * and only then mounts the shared-element transition target.
 */
export function ProfileImageViewer({ open, src, alt, heroId, userId, onClose }: Props) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [-300, 0, 300], [0.2, 1, 0.2]);

  const [zoomed, setZoomed] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastTap = useRef(0);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  const debugBase = {
    userId: userId ?? null,
    avatar_url: sanitizeAvatarUrl(src),
    profile_photo_url: null,
    storagePath: storagePathFromUrl(src),
    publicUrl: sanitizeAvatarUrl(src),
    resolvedUrl: sanitizeAvatarUrl(src),
    heroTransitionId: heroId ?? null,
  };

  useEffect(() => {
    scale.set(1);
    x.set(0);
    y.set(0);
    setZoomed(false);
    setNaturalSize(null);
    setErrorMessage(null);

    if (!open) {
      setLoadState("idle");
      return;
    }

    if (!src) {
      setLoadState("error");
      setErrorMessage("No profile image is available.");
      logViewer("load-error", {
        ...debugBase,
        imageLoaded: false,
        naturalSize: null,
        viewerState: "error",
        reason: "missing-src",
      });
      return;
    }

    let active = true;
    setLoadState("loading");
    logViewer("load-start", {
      ...debugBase,
      imageLoaded: false,
      naturalSize: null,
      viewerState: "loading",
    });

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!active) return;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (width > 0 && height > 0) {
        setNaturalSize({ width, height });
        setLoadState("loaded");
        logViewer("load-success", {
          ...debugBase,
          imageLoaded: true,
          naturalSize: { width, height },
          viewerState: "loaded",
        });
      } else {
        setLoadState("error");
        setErrorMessage("Profile image loaded without usable dimensions.");
        logViewer("load-error", {
          ...debugBase,
          imageLoaded: false,
          naturalSize: { width, height },
          viewerState: "error",
          reason: "zero-natural-size",
        });
      }
    };
    img.onerror = () => {
      if (!active) return;
      setLoadState("error");
      setErrorMessage("Profile image could not be loaded.");
      logViewer("load-error", {
        ...debugBase,
        imageLoaded: false,
        naturalSize: null,
        viewerState: "error",
        reason: "network-or-decode-failure",
      });
    };
    img.src = src;

    return () => {
      active = false;
      img.onload = null;
      img.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, src, heroId, userId, scale, x, y]);

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
      pinchRef.current = { startDist: dist(e.touches[0], e.touches[1]), startScale: scale.get() };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const next = Math.max(1, Math.min(5, pinchRef.current.startScale * (dist(e.touches[0], e.touches[1]) / pinchRef.current.startDist)));
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
      {open && (
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
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </motion.button>

          {loadState === "loading" && (
            <div className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/75 backdrop-blur-md">
              Loading image…
            </div>
          )}

          {loadState === "error" && (
            <div className="relative z-10 mx-6 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-center text-white backdrop-blur-md">
              <AlertCircle className="mx-auto mb-3 h-7 w-7 text-white/70" />
              <p className="text-sm font-semibold">Image unavailable</p>
              <p className="mt-1 text-xs text-white/60">{errorMessage}</p>
            </div>
          )}

          {loadState === "loaded" && src && (
            <motion.div
              key={`${heroId ?? "profile-image"}:${src}`}
              layoutId={heroId}
              className="relative flex h-[90vh] w-[90vw] touch-none select-none items-center justify-center overflow-visible rounded-2xl"
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
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              data-natural-width={naturalSize?.width}
              data-natural-height={naturalSize?.height}
            >
              <img
                src={src}
                alt={alt ?? ""}
                draggable={false}
                className="block h-full w-full select-none object-contain pointer-events-none"
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}