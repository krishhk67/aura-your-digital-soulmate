import { useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageCircle, Zap } from "lucide-react";

interface Room {
  id: string;
  name: string;
  emoji: string;
  description: string;
  members: number;
  color: string;
}

const ROOMS: Room[] = [
  { id: "anime", name: "Anime Lounge", emoji: "🎌", description: "Talk about your favorite anime", members: 42, color: "oklch(0.7 0.22 330)" },
  { id: "coding", name: "Dev Hub", emoji: "💻", description: "Code, debug, and build together", members: 128, color: "oklch(0.65 0.28 180)" },
  { id: "study", name: "Study Room", emoji: "📚", description: "Focus sessions & study buddies", members: 35, color: "oklch(0.75 0.2 60)" },
  { id: "midnight", name: "Midnight Talks", emoji: "🌙", description: "Late night deep conversations", members: 67, color: "oklch(0.72 0.25 285)" },
  { id: "music", name: "Music Vibes", emoji: "🎵", description: "Share tracks & discover music", members: 89, color: "oklch(0.7 0.22 30)" },
  { id: "heartbreak", name: "Heartbreak Hotel", emoji: "💔", description: "Vent, heal, and find support", members: 23, color: "oklch(0.6 0.24 25)" },
];

export function RoomsView() {
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const toggleJoin = (id: string) => {
    setJoined(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 pt-[env(safe-area-inset-top,12px)] pb-2">
        <div className="flex items-center gap-2 py-3">
          <Users className="h-6 w-6 text-neon" />
          <span className="font-display font-bold text-2xl gradient-text">Rooms</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Join themed rooms and chat with the community</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {ROOMS.map((room, i) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl glass-panel border border-glass-border p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `color-mix(in oklch, ${room.color} 20%, transparent)` }}
              >
                {room.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-[15px]">{room.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{room.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />{room.members} online
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-neon" />Active
                  </span>
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleJoin(room.id)}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                joined.has(room.id)
                  ? "bg-secondary/50 text-muted-foreground border border-border"
                  : "bg-primary/20 text-neon border border-primary/20 hover:shadow-[0_0_15px_var(--neon-glow)]"
              }`}
            >
              {joined.has(room.id) ? "Joined ✓" : "Join Room"}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
