import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Phone, User as UserIcon, X } from "lucide-react";
import type { ProfileRow } from "@/hooks/useRealtimeChat";
import { FullscreenImageViewer } from "./FullscreenImageViewer";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: ProfileRow | null;
  onMessage?: () => void;
  onCall?: () => void;
  onViewProfile?: () => void;
}

/**
 * WhatsApp-style floating profile photo preview.
 * Tap the enlarged avatar to open the fullscreen image viewer.
 * Uses a per-user `heroId` so shared-element transitions never collide
 * with another profile's avatar (which caused the "shrink to tiny circle" bug).
 */
export function ProfilePhotoPreview({
  open,
  onClose,
  profile,
  onMessage,
  onCall,
  onViewProfile,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const avatar = profile?.avatar_url ?? null;
  const heroId = profile?.id ? `avatar-hero-${profile.id}` : undefined;
  const initial = (profile?.display_name ?? profile?.username ?? "?")
    .charAt(0)
    .toUpperCase();


  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/75 backdrop-blur-xl"
              onClick={onClose}
            />

            <motion.button
              onClick={onClose}
              className="absolute top-[env(safe-area-inset-top,16px)] right-4 z-10 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0 }}
            >
              <X className="h-5 w-5" />
            </motion.button>

            <motion.button
              onClick={() => avatar && setFullscreen(true)}
              className="relative z-10 rounded-full overflow-hidden shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]"
              layoutId={heroId}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              whileTap={{ scale: 0.97 }}
            >

              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-[260px] w-[260px] max-h-[70vw] max-w-[70vw] object-cover"
                />
              ) : (
                <div className="h-[260px] w-[260px] max-h-[70vw] max-w-[70vw] bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-6xl font-bold text-white">
                  {initial}
                </div>
              )}
            </motion.button>

            <motion.div
              className="relative z-10 mt-6 text-center max-w-[85vw]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.08 } }}
              exit={{ opacity: 0, y: 8 }}
            >
              <h2 className="font-display font-bold text-2xl text-white">
                {profile?.display_name ?? profile?.username ?? "User"}
              </h2>
              {profile?.username && (
                <p className="text-sm text-white/60 mt-0.5">@{profile.username}</p>
              )}
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/70">
                {profile?.is_online && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--neon-glow)]" />
                    Online
                  </span>
                )}
                {profile?.status_text && (
                  <span className="italic truncate">"{profile.status_text}"</span>
                )}
              </div>
            </motion.div>

            <motion.div
              className="relative z-10 mt-8 flex items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.14 } }}
              exit={{ opacity: 0, y: 8 }}
            >
              <PreviewAction
                icon={<UserIcon className="h-5 w-5" />}
                label="Profile"
                onClick={() => {
                  onClose();
                  onViewProfile?.();
                }}
              />
              <PreviewAction
                icon={<MessageSquare className="h-5 w-5" />}
                label="Message"
                primary
                onClick={() => {
                  onClose();
                  onMessage?.();
                }}
              />
              <PreviewAction
                icon={<Phone className="h-5 w-5" />}
                label="Call"
                onClick={() => {
                  onClose();
                  onCall?.();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FullscreenImageViewer
        open={fullscreen}
        src={avatar}
        alt={profile?.display_name ?? ""}
        heroId={heroId}
        onClose={() => setFullscreen(false)}
      />

    </>
  );
}

function PreviewAction({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={
        "flex flex-col items-center justify-center gap-1 h-16 w-20 rounded-2xl backdrop-blur-md transition-colors " +
        (primary
          ? "bg-primary text-primary-foreground shadow-[0_0_18px_var(--neon-glow)]"
          : "bg-white/10 text-white hover:bg-white/15 border border-white/10")
      }
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </motion.button>
  );
}
