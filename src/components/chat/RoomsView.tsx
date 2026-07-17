import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Users, Lock, Hash, LogIn, Sparkles, Flame, Star, Mic,
  Globe2, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useRooms, useRoomActions, useSignedRoomMedia,
  type RoomRow,
} from "@/hooks/useRooms";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { RoomChat } from "./RoomChat";
import { toast } from "sonner";

type Room = RoomRow & { member_count: number; is_member: boolean };

const FILTERS = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "favorites", label: "Joined", icon: Star },
  { id: "public", label: "Public", icon: Globe2 },
  { id: "private", label: "Private", icon: Lock },
  { id: "tech", label: "Tech" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "movies", label: "Movies" },
  { id: "study", label: "Study" },
  { id: "anime", label: "Anime" },
  { id: "ai", label: "AI" },
] as const;

export function RoomsView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [focused, setFocused] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const { rooms, loading } = useRooms(search);
  const { joinRoom, joinByCode } = useRoomActions();

  if (activeRoom) return <RoomChat roomId={activeRoom} onBack={() => setActiveRoom(null)} />;

  const handleJoin = async (room: Room) => {
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
    setJoinCode(""); setShowJoin(false); setActiveRoom(roomId);
  };

  // Apply chip filter over search-filtered rooms
  const filtered = useMemo(() => {
    let list = [...rooms];
    switch (filter) {
      case "trending":
        list = list.filter(r => r.member_count >= 3).sort((a, b) => b.member_count - a.member_count);
        break;
      case "favorites": list = list.filter(r => r.is_member); break;
      case "public": list = list.filter(r => !r.is_private); break;
      case "private": list = list.filter(r => r.is_private); break;
      case "all": break;
      default: {
        const kw = filter.toLowerCase();
        list = list.filter(r =>
          (r.name?.toLowerCase().includes(kw) || r.description?.toLowerCase().includes(kw))
        );
      }
    }
    return list;
  }, [rooms, filter]);

  // Pick the "featured" room — highest member count, prefer joined
  const featured = useMemo(() => {
    if (!filtered.length) return null;
    return [...filtered].sort((a, b) => Number(b.is_member) - Number(a.is_member) || b.member_count - a.member_count)[0];
  }, [filtered]);

  const rest = filtered.filter(r => r.id !== featured?.id);

  return (
    <div className="relative h-full flex flex-col bg-background overflow-hidden">
      <AmbientBackdrop />

      {/* HEADER */}
      <div
        className="relative z-10 px-5 pb-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
      >
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
          style={{ paddingRight: "env(safe-area-inset-right, 0px)" }}
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/30 shadow-[0_0_24px_var(--neon-glow)]">
              <Users className="h-5 w-5 text-neon" />
              <span className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl -z-10" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-[22px] leading-none gradient-text">Rooms</h1>
              <p className="text-[11px] text-muted-foreground mt-1.5">Communities · live right now</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlassIconButton onClick={() => setShowJoin(v => !v)} label="Join by code">
              <LogIn className="h-4 w-4" />
            </GlassIconButton>
            <GlassIconButton onClick={() => setCreateOpen(true)} label="Create room" primary>
              <Plus className="h-4 w-4" />
            </GlassIconButton>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mt-6 relative">
          <motion.div
            animate={{
              boxShadow: focused
                ? "0 0 0 1px hsl(var(--neon-glow) / 0.5), 0 0 30px -6px hsl(var(--neon-glow) / 0.55)"
                : "0 0 0 1px hsl(var(--border) / 0.35), 0 0 0px 0px hsl(var(--neon-glow) / 0)",
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-2 rounded-2xl bg-secondary/30 backdrop-blur-xl px-3.5 h-11"
          >
            <Search className={`h-4 w-4 transition-colors ${focused ? "text-neon" : "text-muted-foreground"}`} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search rooms, topics or members…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-muted-foreground px-2 py-0.5 rounded-full active:bg-secondary">
                clear
              </button>
            )}
          </motion.div>
        </div>

        {/* Join-by-code inline field */}
        <AnimatePresence>
          {showJoin && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Paste invite code"
                  className="flex-1 h-10 px-3 rounded-xl bg-secondary/50 border border-glass-border text-sm outline-none focus:border-primary/60"
                />
                <button
                  onClick={joinWithCode}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-[0_0_18px_var(--neon-glow)] active:scale-95 transition-transform"
                >
                  Join
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FILTER CHIPS */}
        <div className="mt-6 -mx-5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 py-1 px-5 w-max">
            {FILTERS.map(f => {
              const Icon = "icon" in f ? f.icon : undefined;
              const active = filter === f.id;
              return (
                <motion.button
                  key={f.id}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  onClick={() => setFilter(f.id)}
                  className={`relative h-8 px-3.5 rounded-full text-[12.5px] font-medium flex items-center gap-1.5 transition-colors ${
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground bg-secondary/40 backdrop-blur border border-glass-border"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="chip-active-bg"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_16px_var(--neon-glow),inset_0_1px_0_hsl(var(--foreground)/0.12)]"
                    />
                  )}
                  {Icon && <Icon className="h-3.5 w-3.5 relative" />}
                  <span className="relative">{f.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-5">
        {loading && <SkeletonList />}

        {!loading && filtered.length === 0 && (
          <EmptyState onCreate={() => setCreateOpen(true)} search={search} filter={filter} />
        )}

        {!loading && featured && (
          <FeaturedRoom room={featured} onOpen={handleJoin} />
        )}

        {!loading && rest.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                {filter === "favorites" ? "Your rooms" : "Discover"}
              </h3>
              <span className="text-[11px] text-muted-foreground">{rest.length}</span>
            </div>
            <div className="space-y-2.5">
              {rest.map((r, i) => (
                <RoomCard key={r.id} room={r} index={i} onOpen={handleJoin} />
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={id => { setCreateOpen(false); setActiveRoom(id); }}
      />
    </div>
  );
}

/* ─────────────────────────── SUB-COMPONENTS ─────────────────────────── */

function GlassIconButton({
  children, onClick, label, primary,
}: { children: React.ReactNode; onClick: () => void; label: string; primary?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`h-10 w-10 rounded-full flex items-center justify-center border transition-shadow ${
        primary
          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground border-primary/50 shadow-[0_0_22px_var(--neon-glow)]"
          : "bg-secondary/40 backdrop-blur-xl border-glass-border text-foreground hover:shadow-[0_0_14px_hsl(var(--neon-glow)/0.35)]"
      }`}
    >
      {children}
    </motion.button>
  );
}

function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* aurora blobs */}
      <motion.div
        className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full blur-3xl opacity-[0.35]"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.55), transparent 60%)" }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 -right-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-[0.28]"
        style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.5), transparent 60%)" }}
        animate={{ x: [0, -30, 20, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 40%, transparent 75%)",
        }}
      />
      {/* particles */}
      {[...Array(14)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/60"
          style={{ left: `${(i * 73) % 100}%`, top: `${(i * 37) % 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}
    </div>
  );
}

function VoiceBars({ count = 4 }: { count?: number }) {
  return (
    <span className="inline-flex items-end gap-[2px] h-3">
      {[...Array(count)].map((_, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-emerald-400"
          animate={{ height: ["25%", "100%", "40%", "80%", "30%"] }}
          transition={{ duration: 1 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
          style={{ height: "40%" }}
        />
      ))}
    </span>
  );
}

function StatusPill({
  tone, icon: Icon, children, pulse,
}: { tone: "green" | "amber" | "violet" | "muted" | "primary"; icon?: any; children: React.ReactNode; pulse?: boolean }) {
  const toneMap = {
    green: "text-emerald-300 bg-emerald-500/12 border-emerald-400/25",
    amber: "text-amber-300 bg-amber-500/12 border-amber-400/25",
    violet: "text-fuchsia-300 bg-fuchsia-500/12 border-fuchsia-400/25",
    muted: "text-muted-foreground bg-secondary/40 border-glass-border",
    primary: "text-neon bg-primary/15 border-primary/30",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-medium border backdrop-blur ${toneMap}`}>
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

/** Fetch a handful of member profiles for avatar stack rendering. */
function useRoomMemberPreview(roomId: string) {
  const [profiles, setProfiles] = useState<{ id: string; avatar_url: string | null; display_name: string | null }[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: mm } = await supabase.from("room_members").select("user_id").eq("room_id", roomId).limit(4);
      const ids = (mm ?? []).map(r => r.user_id);
      if (!ids.length) { if (active) setProfiles([]); return; }
      const { data: profs } = await supabase.from("profiles").select("id,avatar_url,display_name").in("id", ids);
      if (active) setProfiles((profs as any[]) ?? []);
    })();
    return () => { active = false; };
  }, [roomId]);
  return profiles;
}

function AvatarStack({ roomId, total }: { roomId: string; total: number }) {
  const profiles = useRoomMemberPreview(roomId);
  const extra = Math.max(0, total - profiles.length);
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {profiles.slice(0, 3).map((p, i) => (
          <MemberAvatarDot key={p.id} profile={p} z={10 - i} />
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-1.5 text-[10.5px] font-semibold text-muted-foreground">+{extra}</span>
      )}
      {profiles.length === 0 && total === 0 && (
        <span className="text-[10.5px] text-muted-foreground">Be the first</span>
      )}
    </div>
  );
}

function MemberAvatarDot({ profile, z }: { profile: { avatar_url: string | null; display_name: string | null }; z: number }) {
  const initial = (profile.display_name ?? "?").charAt(0).toUpperCase();
  return (
    <motion.div
      whileHover={{ scale: 1.15, zIndex: 20 }}
      style={{ zIndex: z }}
      className="h-6 w-6 rounded-full ring-2 ring-background overflow-hidden bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-[10px] font-bold text-primary-foreground"
    >
      {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
    </motion.div>
  );
}

function FeaturedRoom({ room, onOpen }: { room: Room; onOpen: (r: Room) => void }) {
  const avatar = useSignedRoomMedia(room.avatar_url);
  const trending = room.member_count >= 3;
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -3 }} whileTap={{ scale: 0.99 }}
      onClick={() => onOpen(room)}
      className="group relative w-full text-left rounded-3xl overflow-hidden border border-glass-border bg-gradient-to-br from-secondary/60 via-secondary/30 to-secondary/50 backdrop-blur-xl p-4 pt-5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]"
    >
      {/* animated glow */}
      <motion.div
        aria-hidden
        className="absolute -inset-20 opacity-40 blur-3xl -z-0"
        style={{ background: "conic-gradient(from 90deg, hsl(var(--primary)/0.35), hsl(var(--accent)/0.25), hsl(var(--primary)/0.35))" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      {/* banner strip */}
      <div className="relative h-24 -mx-4 -mt-5 mb-3 overflow-hidden">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover opacity-40 blur-[1px] scale-110" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/95 via-secondary/40 to-transparent" />
        <div className="absolute top-2.5 left-4 flex items-center gap-1.5">
          <StatusPill tone="primary" icon={Sparkles}>Featured</StatusPill>
          {trending && <StatusPill tone="amber" icon={Flame} pulse>Trending</StatusPill>}
        </div>
      </div>

      <div className="relative flex items-start gap-3">
        <div className="relative h-14 w-14 -mt-10 rounded-2xl overflow-hidden ring-4 ring-secondary bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_var(--neon-glow)]">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <Hash className="h-6 w-6 text-primary-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-bold text-[17px] truncate">{room.name}</h3>
            {room.is_private ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {room.description || "A live space for the community. Jump in and start the conversation."}
          </p>

          <div className="flex items-center gap-3 mt-3">
            <AvatarStack roomId={room.id} total={room.member_count} />
            <span className="h-3 w-px bg-glass-border" />
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {room.member_count} member{room.member_count !== 1 ? "s" : ""}
            </span>
            {trending && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
                <Mic className="h-3 w-3" /> <VoiceBars />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {room.is_member ? "You're in" : room.is_private ? "Private community" : "Open to everyone"}
        </span>
        <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[12.5px] font-semibold shadow-[0_0_20px_var(--neon-glow)] group-hover:shadow-[0_0_30px_var(--neon-glow)] transition-shadow">
          {room.is_member ? "Enter" : "Join"} <LogIn className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.button>
  );
}

function RoomCard({ room, index, onOpen }: { room: Room; index: number; onOpen: (r: Room) => void }) {
  const avatar = useSignedRoomMedia(room.avatar_url);
  const trending = room.member_count >= 5;
  const speaking = room.member_count >= 3;

  // Cheap deterministic accent tint per room
  const tint = useMemo(() => {
    const seed = [...room.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `hsl(${seed} 70% 60% / 0.18)`;
  }, [room.id]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpen(room)}
      className="group relative w-full text-left rounded-2xl border border-glass-border bg-secondary/30 backdrop-blur-xl p-3.5 flex flex-col gap-3 overflow-hidden hover:border-primary/40 hover:shadow-[0_10px_30px_-14px_hsl(var(--neon-glow)/0.6),0_0_0_1px_hsl(var(--primary)/0.25)] transition-all"
    >
      {/* per-room tint spill */}
      <span aria-hidden className="absolute -inset-8 blur-3xl opacity-70 pointer-events-none -z-10" style={{ background: `radial-gradient(circle at 20% 0%, ${tint}, transparent 60%)` }} />

      <div className="flex items-start gap-3 min-w-0">
        <div className="relative h-12 w-12 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/25 border border-primary/20 flex-shrink-0">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Hash className="h-5 w-5 text-neon" />}
          {speaking && (
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
              <Mic className="h-2.5 w-2.5 text-emerald-950" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-semibold text-[15px] truncate">{room.name}</h3>
            {room.is_private
              ? <Lock className="h-3 w-3 text-muted-foreground" />
              : <ShieldCheck className="h-3 w-3 text-emerald-400/80" />}
          </div>
          {room.description && (
            <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{room.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {room.is_private
              ? <StatusPill tone="violet" icon={Lock}>Private</StatusPill>
              : <StatusPill tone="green" icon={Globe2}>Public</StatusPill>}
            {trending && <StatusPill tone="amber" icon={Flame} pulse>Trending</StatusPill>}
            {speaking && (
              <StatusPill tone="green" icon={Mic}>
                <span className="mr-1">Voice</span><VoiceBars count={3} />
              </StatusPill>
            )}
            {room.is_member && <StatusPill tone="primary" icon={Star}>Joined</StatusPill>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <AvatarStack roomId={room.id} total={room.member_count} />
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {room.member_count}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 h-8 px-3.5 rounded-full text-[12px] font-semibold transition-all ${
            room.is_member
              ? "bg-secondary/70 text-foreground border border-glass-border"
              : "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_14px_var(--neon-glow)] group-hover:shadow-[0_0_22px_var(--neon-glow)]"
          }`}
        >
          {room.is_member ? "Enter" : "Join"}
        </span>
      </div>
    </motion.button>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      <div className="h-40 rounded-3xl bg-secondary/30 border border-glass-border animate-pulse" />
      {[0, 1, 2].map(i => (
        <div key={i} className="h-24 rounded-2xl bg-secondary/25 border border-glass-border animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate, search, filter }: { onCreate: () => void; search: string; filter: string }) {
  const filtered = !!search || filter !== "all";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative text-center py-14 px-6"
    >
      <div className="relative mx-auto h-24 w-24 mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative h-full w-full rounded-3xl bg-gradient-to-br from-primary/25 to-accent/15 border border-primary/25 flex items-center justify-center shadow-[0_0_40px_var(--neon-glow)]">
          <Hash className="h-10 w-10 text-neon" />
        </div>
        <motion.span
          className="absolute inset-0 rounded-3xl border border-primary/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
      </div>
      <h3 className="font-display font-bold text-xl gradient-text mb-1">
        {filtered ? "No rooms match" : "No Rooms Yet"}
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        {filtered
          ? "Try a different filter or search term."
          : "Create your first room and start chatting in realtime."}
      </p>
      {!filtered && (
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-[0_0_24px_var(--neon-glow)] hover:scale-[1.03] active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" /> Create Room
        </button>
      )}
    </motion.div>
  );
}
