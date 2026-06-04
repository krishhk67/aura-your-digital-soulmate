import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Camera, Pencil, Check, UserMinus, Crown, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { ChatRow, ProfileRow } from "@/hooks/useRealtimeChat";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  chat: ChatRow & { description?: string | null } | null;
}

interface MemberRow {
  user_id: string;
  role: string | null;
  joined_at: string | null;
  profile: ProfileRow | null;
}

export function GroupInfoSheet({ open, onClose, chat }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [media, setMedia] = useState<{ url: string; type: string }[]>([]);
  const [editing, setEditing] = useState<"name" | "description" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const me = members.find(m => m.user_id === user?.id);
  const isOwner = chat?.created_by === user?.id;
  const isAdmin = isOwner || me?.role === "admin" || me?.role === "owner";

  const load = async () => {
    if (!chat) return;
    setName(chat.name ?? "");
    setDescription(chat.description ?? "");

    const { data: rows } = await supabase
      .from("chat_members")
      .select("user_id, role, joined_at")
      .eq("chat_id", chat.id)
      .order("joined_at", { ascending: true });

    if (rows?.length) {
      const ids = rows.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
      const pmap = new Map((profiles ?? []).map(p => [p.id, p as ProfileRow]));
      setMembers(rows.map(r => ({ ...r, profile: pmap.get(r.user_id) ?? null })));
    } else {
      setMembers([]);
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("media_url,message_type")
      .eq("chat_id", chat.id)
      .not("media_url", "is", null)
      .in("message_type", ["image", "video"])
      .order("created_at", { ascending: false })
      .limit(9);
    setMedia((msgs ?? []).filter(m => m.media_url).map(m => ({ url: m.media_url as string, type: m.message_type ?? "image" })));
  };

  useEffect(() => { if (open && chat) load(); /* eslint-disable-next-line */ }, [open, chat?.id]);

  // realtime sync
  useEffect(() => {
    if (!open || !chat) return;
    const ch = supabase
      .channel(`group-info:${chat.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats", filter: `id=eq.${chat.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members", filter: `chat_id=eq.${chat.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [open, chat?.id]);

  const saveField = async (field: "name" | "description") => {
    if (!chat) return;
    const value = field === "name" ? name.trim() : description.trim();
    const payload: { name?: string | null; description?: string | null } =
      field === "name" ? { name: value || null } : { description: value || null };
    const { error } = await supabase.from("chats").update(payload).eq("id", chat.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    setEditing(null);
  };

  const uploadAvatar = async (file: File) => {
    if (!chat || !user) return;
    setSavingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `group-${chat.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("chats").update({ avatar_url: pub.publicUrl }).eq("id", chat.id);
      if (error) throw error;
      toast.success("Group photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeMember = async (m: MemberRow) => {
    if (!chat) return;
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", chat.id).eq("user_id", m.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${m.profile?.display_name ?? "Member"} removed`);
    setRemoveTarget(null);
  };

  const promote = async (m: MemberRow) => {
    if (!chat) return;
    const nextRole = m.role === "admin" || m.role === "owner" ? "member" : "admin";
    const { error } = await supabase.from("chat_members").update({ role: nextRole }).eq("chat_id", chat.id).eq("user_id", m.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success(nextRole === "admin" ? "Promoted to admin" : "Demoted to member");
  };

  return (
    <AnimatePresence>
      {open && chat && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 top-12 z-50 rounded-t-3xl bg-background border-t border-glass-border overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
              <h2 className="font-display font-semibold">Group Info</h2>
              <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="relative inline-block">
                {chat.avatar_url ? (
                  <img src={chat.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover mx-auto ring-2 ring-primary/40" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-3xl mx-auto">
                    👥
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={savingAvatar}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {editing === "name" ? (
                  <>
                    <input value={name} onChange={e => setName(e.target.value)}
                      className="bg-secondary rounded-lg px-3 py-1.5 text-center font-display font-bold text-xl focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <button onClick={() => saveField("name")} className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-display font-bold text-xl">{chat.name ?? "Group"}</h3>
                    {isAdmin && (
                      <button onClick={() => setEditing("name")} className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Created {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })} · {members.length} member{members.length === 1 ? "" : "s"}
              </p>
            </div>

            {/* Description */}
            <div className="mx-4 mb-4 p-4 glass-panel rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Description</p>
                {isAdmin && editing !== "description" && (
                  <button onClick={() => setEditing("description")} className="text-xs text-neon flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                )}
              </div>
              {editing === "description" ? (
                <div className="space-y-2">
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    placeholder="Add a group description..."
                    className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditing(null); setDescription(chat.description ?? ""); }} className="px-3 py-1 text-xs rounded-lg hover:bg-secondary">Cancel</button>
                    <button onClick={() => saveField("description")} className="px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/80">
                  {chat.description || <span className="text-muted-foreground italic">No description yet</span>}
                </p>
              )}
            </div>

            {/* Members */}
            <div className="mx-4 mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Members ({members.length})</p>
              <div className="glass-panel rounded-2xl divide-y divide-border/40 overflow-hidden">
                {members.map(m => {
                  const isMe = m.user_id === user?.id;
                  const isRoleOwner = m.user_id === chat.created_by;
                  const isRoleAdmin = m.role === "admin" || m.role === "owner";
                  return (
                    <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="relative flex-shrink-0">
                        {m.profile?.avatar_url ? (
                          <img src={m.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">
                            {m.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        {m.profile?.is_online && !m.profile?.ghost_mode && (
                          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border-2 border-background" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {m.profile?.display_name ?? "Unknown"} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                          {isRoleOwner && <Crown className="h-3 w-3 text-amber-400" />}
                          {!isRoleOwner && isRoleAdmin && <Shield className="h-3 w-3 text-neon" />}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.profile?.username ? `@${m.profile.username} · ` : ""}
                          {m.profile?.is_online && !m.profile?.ghost_mode ? "online" : "offline"}
                        </p>
                      </div>
                      {isAdmin && !isMe && !isRoleOwner && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => promote(m)} title={isRoleAdmin ? "Demote" : "Promote to admin"}
                            className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setRemoveTarget(m)} title="Remove"
                            className="h-8 w-8 rounded-full hover:bg-destructive/20 flex items-center justify-center text-destructive">
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shared media */}
            <div className="mx-4 mb-8">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Shared Media
              </p>
              {media.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center glass-panel rounded-2xl">No media yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {media.map((m, i) => (
                    <a key={i} href={m.url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-secondary">
                      {m.type === "video" ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <ConfirmDialog
            open={!!removeTarget}
            onClose={() => setRemoveTarget(null)}
            title="Remove member?"
            description={`${removeTarget?.profile?.display_name ?? "This member"} will be removed from the group.`}
            confirmLabel="Remove"
            destructive
            onConfirm={() => { if (removeTarget) removeMember(removeTarget); }}
          />

        </>
      )}
    </AnimatePresence>
  );
}
