import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Users, Lock, Hash, LogIn } from "lucide-react";
import { useRooms, useRoomActions, useSignedRoomMedia, type RoomRow } from "@/hooks/useRooms";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { RoomChat } from "./RoomChat";
import { toast } from "sonner";

export function RoomsView() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const { rooms, loading } = useRooms(search);
  const { joinRoom, joinByCode } = useRoomActions();

  if (activeRoom) {
    return <RoomChat roomId={activeRoom} onBack={() => setActiveRoom(null)} />;
  }

  const handleJoin = async (room: RoomRow & { is_member: boolean }) => {
    if (room.is_member) { setActiveRoom(room.id); return; }
    if (room.is_private) {
      const code = prompt("Enter invite code");
      if (!code) return;
      const { error } = await joinRoom(room.id, code);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await joinRoom(room.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Joined room");
    setActiveRoom(room.id);
  };

  const joinWithCode = async () => {
    if (!joinCode.trim()) return;
    const { error, roomId } = await joinByCode(joinCode.trim());
    if (error || !roomId) { toast.error(error?.message ?? "Invalid code"); return; }
    toast.success("Joined room");
    setJoinCode("");
    setShowJoin(false);
    setActiveRoom(roomId);
  };

  const joined = rooms.filter(r => r.is_member);
  const discover = rooms.filter(r => !r.is_member && !r.is_private);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 pt-[env(safe-area-inset-top,12px)] pb-3 space-y-3">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-neon" />
            <span className="font-display font-bold text-2xl gradient-text">Rooms</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowJoin(v => !v)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center" title="Join by code">
              <LogIn className="h-4 w-4" />
            </button>
            <button onClick={() => setCreateOpen(true)} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_15px_var(--neon-glow)]">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2 border border-glass-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <AnimatePresence>
          {showJoin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2">
                <input
                  value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Invite code"
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary/40 border border-glass-border text-sm outline-none"
                />
                <button onClick={joinWithCode} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Join</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        {loading && <div className="text-center text-xs text-muted-foreground py-8">Loading…</div>}

        {!loading && joined.length > 0 && (
          <Section title="Your Rooms" rooms={joined} onOpen={(r) => setActiveRoom(r.id)} />
        )}

        {!loading && discover.length > 0 && (
          <Section title="Discover" rooms={discover} onOpen={handleJoin} actionLabel="Join" />
        )}

        {!loading && rooms.length === 0 && (
          <div className="text-center py-12 px-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hash className="h-7 w-7 text-neon" />
            </div>
            <h3 className="font-display font-bold text-lg gradient-text mb-1">No rooms yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create the first community room and invite people in.</p>
            <button onClick={() => setCreateOpen(true)} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
              Create Room
            </button>
          </div>
        )}
      </div>

      <CreateRoomDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setActiveRoom(id); }} />
    </div>
  );
}

function Section({ title, rooms, onOpen, actionLabel }: {
  title: string;
  rooms: (RoomRow & { member_count: number; is_member: boolean })[];
  onOpen: (r: RoomRow & { member_count: number; is_member: boolean }) => void;
  actionLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground px-1">{title}</h3>
      {rooms.map((r, i) => (
        <RoomCard key={r.id} room={r} index={i} onOpen={onOpen} actionLabel={actionLabel} />
      ))}
    </div>
  );
}

function RoomCard({ room, index, onOpen, actionLabel }: {
  room: RoomRow & { member_count: number; is_member: boolean };
  index: number;
  onOpen: (r: RoomRow & { member_count: number; is_member: boolean }) => void;
  actionLabel?: string;
}) {
  const avatar = useSignedRoomMedia(room.avatar_url);
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(room)}
      className="w-full text-left rounded-2xl glass-panel border border-glass-border p-3.5 flex items-center gap-3"
    >
      <div className="h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center bg-primary/15 flex-shrink-0">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <Hash className="h-5 w-5 text-neon" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display font-semibold text-[15px] truncate">{room.name}</h3>
          {room.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
        {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />{room.member_count} member{room.member_count !== 1 ? "s" : ""}
        </div>
      </div>
      {actionLabel && (
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/20 text-neon border border-primary/30">{actionLabel}</span>
      )}
    </motion.button>
  );
}
