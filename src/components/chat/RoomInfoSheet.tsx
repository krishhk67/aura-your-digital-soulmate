import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Shield, UserMinus, Copy, LogOut, Trash2, Pencil, Check, Camera } from "lucide-react";
import { useRoom, useRoomActions, useSignedRoomMedia } from "@/hooks/useRooms";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  roomId: string | null;
  open: boolean;
  onClose: () => void;
  onLeft?: () => void;
}

export function RoomInfoSheet({ roomId, open, onClose, onLeft }: Props) {
  const { user } = useAuth();
  const { room, members } = useRoom(open ? roomId : null);
  const { leaveRoom, deleteRoom, updateRoom, setRole, removeMember } = useRoomActions();
  const avatarUrl = useSignedRoomMedia(room?.avatar_url ?? null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !room) return null;
  const myRole = members.find(m => m.user_id === user?.id)?.role;
  const isOwner = myRole === "owner";
  const isMod = isOwner || myRole === "admin";

  const startEdit = () => { setName(room.name); setDesc(room.description ?? ""); setEditing(true); };
  const saveEdit = async () => {
    setBusy(true);
    const { error } = await updateRoom(room.id, { name: name.trim() || room.name, description: desc.trim() || null });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Updated"); setEditing(false); }
  };

  const uploadAvatar = async (file: File) => {
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/avatars/${crypto.randomUUID()}.${ext}`;
    const { supabase } = await import("@/integrations/supabase/client");
    const { error: upErr } = await supabase.storage.from("room-media").upload(path, file);
    if (!upErr) await updateRoom(room.id, { avatar_url: path });
    setBusy(false);
  };

  const leave = async () => {
    const { error } = await leaveRoom(room.id);
    if (error) toast.error(error.message); else { toast.success("Left room"); onLeft?.(); onClose(); }
  };

  const remove = async () => {
    if (!confirm("Delete this room? This cannot be undone.")) return;
    const { error } = await deleteRoom(room.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onLeft?.(); onClose(); }
  };

  const copyInvite = () => {
    if (!room.invite_code) return;
    navigator.clipboard.writeText(room.invite_code);
    toast.success("Invite code copied");
  };

  const sortedMembers = [...members].sort((a, b) =>
    a.role === b.role ? 0 : a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.role === "admin" ? -1 : 1
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 max-h-[92dvh] glass-panel rounded-t-3xl border-t border-glass-border overflow-y-auto"
        >
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/70 border-b border-glass-border px-5 py-3 flex items-center justify-between">
            <span className="font-display font-bold">Room Info</span>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-5 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <label className={`relative h-24 w-24 rounded-3xl overflow-hidden flex items-center justify-center bg-secondary border border-glass-border ${isOwner ? "cursor-pointer" : ""}`}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-3xl font-display gradient-text">{room.name[0]?.toUpperCase()}</span>}
                {isOwner && (
                  <>
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                  </>
                )}
              </label>
              {editing ? (
                <div className="w-full space-y-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-secondary/40 border border-glass-border text-sm text-center" />
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full px-4 py-2 rounded-xl bg-secondary/40 border border-glass-border text-sm text-center resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl bg-secondary text-sm">Cancel</button>
                    <button onClick={saveEdit} disabled={busy} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center justify-center gap-1"><Check className="h-4 w-4" />Save</button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="font-display text-xl font-bold gradient-text">{room.name}</h2>
                    {isOwner && <button onClick={startEdit} className="p-1 rounded hover:bg-secondary"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>}
                  </div>
                  {room.description && <p className="text-sm text-muted-foreground mt-1">{room.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{members.length} member{members.length !== 1 ? "s" : ""} · Created {new Date(room.created_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {room.invite_code && (
              <button onClick={copyInvite} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/40 border border-glass-border">
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">Invite code</div>
                  <div className="font-mono text-sm">{room.invite_code}</div>
                </div>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Members</h3>
              <div className="space-y-1.5">
                {sortedMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-secondary/40">
                    <div className="h-10 w-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                      {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-display">{(m.profile?.display_name ?? "?")[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{m.profile?.display_name ?? m.profile?.username ?? "Member"}</span>
                        {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                        {m.role === "admin" && <Shield className="h-3.5 w-3.5 text-neon" />}
                      </div>
                      {m.profile?.bio && <p className="text-xs text-muted-foreground truncate">{m.profile.bio}</p>}
                    </div>
                    {isMod && m.user_id !== user?.id && m.role !== "owner" && (
                      <div className="flex items-center gap-1">
                        {isOwner && (
                          <button
                            onClick={() => setRole(room.id, m.user_id, m.role === "admin" ? "member" : "admin").then(({ error }) => error ? toast.error(error.message) : toast.success(m.role === "admin" ? "Demoted" : "Promoted"))}
                            className="p-1.5 rounded hover:bg-secondary" title={m.role === "admin" ? "Demote" : "Promote to admin"}
                          ><Shield className={`h-4 w-4 ${m.role === "admin" ? "text-neon" : "text-muted-foreground"}`} /></button>
                        )}
                        <button
                          onClick={() => removeMember(room.id, m.user_id).then(({ error }) => error ? toast.error(error.message) : toast.success("Removed"))}
                          className="p-1.5 rounded hover:bg-destructive/15 text-destructive" title="Remove"
                        ><UserMinus className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              {!isOwner && (
                <button onClick={leave} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-destructive font-medium">
                  <LogOut className="h-4 w-4" />Leave Room
                </button>
              )}
              {isOwner && (
                <button onClick={remove} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/15 text-destructive font-medium">
                  <Trash2 className="h-4 w-4" />Delete Room
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
