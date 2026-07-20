import { motion } from "framer-motion";
import { Users, Sparkles } from "lucide-react";
import { useActiveSpaceForChat } from "@/hooks/useAnonymousSpace";

interface Props {
  chatId: string;
  spaceIdHint?: string | null;
  title?: string | null;
  onEnter: (spaceId: string) => void;
}

/** Premium floating invite card, rendered inline as a special message. */
export function SpaceCard({ chatId, spaceIdHint, title, onEnter }: Props) {
  const { space, participantCount } = useActiveSpaceForChat(chatId);
  const activeId = space?.id ?? spaceIdHint ?? null;
  const isLive = !!space && (!spaceIdHint || space.id === spaceIdHint);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative my-3 mx-auto w-full max-w-[320px]"
    >
      {/* Soft breathing halo */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -inset-2 rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(120,110,255,0.25),transparent_70%)] blur-lg pointer-events-none"
      />

      <div className="relative rounded-[22px] border border-white/10 bg-gradient-to-b from-[#1a1a22] to-[#0f0f14] p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.span key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-white/40"
              style={{ left: `${15 + i * 13}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [0, -8, 0], opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/40">
          <Sparkles className="h-3 w-3" />
          Anonymous Space
        </div>
        <h3 className="mt-2 text-[17px] font-semibold text-white leading-tight">
          {title || "Enter anonymously"}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
          <Users className="h-3.5 w-3.5" />
          {isLive ? `${participantCount} inside` : "Space closed"}
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">
          Anonymous conversations. No identities. No history. Everything disappears forever.
        </p>

        {isLive && activeId ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onEnter(activeId)}
            className="mt-4 w-full rounded-xl bg-white text-black py-2.5 text-sm font-semibold"
          >
            Enter
          </motion.button>
        ) : (
          <div className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-center text-sm font-semibold text-white/45">
            Space closed
          </div>
        )}
      </div>
    </motion.div>
  );
}
