import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Image as ImageIcon, Camera, Pencil, Check, UserMinus, Crown, Shield,
  UserPlus, LogOut, Trash2, Search, ArrowRightLeft, MessageSquare, User as UserIcon, Loader2,
  Link2, Copy, RefreshCw, Share2, QrCode, Pin, BellOff, Eraser, Ban, Lock, Users, MessageCircle, Image as ImgIcon, Mic, Info as InfoIcon, PinIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchUsers } from "@/hooks/useRealtimeChat";
import { useChatMemberState, clearChatForMe } from "@/hooks/useChatActions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { ChatRow, ProfileRow } from "@/hooks/useRealtimeChat";
import { ConfirmDialog } from "./ConfirmDialog";
import { SmoothAvatar } from "./SmoothAvatar";

type PermissionKey = "send_messages" | "send_media" | "send_voice" | "add_members" | "edit_info" | "pin_messages";
type PermissionScope = "everyone" | "admins" | "owner";
type PermissionsMap = Partial<Record<PermissionKey, PermissionScope>>;

interface ChatWithExtras extends ChatRow {
  description?: string | null;
  invite_code?: string | null;
  invite_enabled?: boolean | null;
  permissions?: PermissionsMap | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  chat: ChatWithExtras | null;
  onChatRemoved?: () => void;
}

interface MemberRow {
  user_id: string;
  role: string | null;
  joined_at: string | null;
  profile: ProfileRow | null;
}

type Tab = "info" | "members" | "media" | "permissions" | "settings";


export function GroupInfoSheet({ open, onClose, chat, onChatRemoved }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("info");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [media, setMedia] = useState<{ url: string; type: string }[]>([]);
  const [editing, setEditing] = useState<"name" | "description" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [memberAction, setMemberAction] = useState<MemberRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [transferTarget, setTransferTarget] = useState<MemberRow | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [savingPerm, setSavingPerm] = useState<PermissionKey | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const memberState = useChatMemberState(chat?.id ?? null);

  const me = members.find((m) => m.user_id === user?.id);
  const isOwner = chat?.created_by === user?.id;
  const isAdmin = isOwner || me?.role === "admin" || me?.role === "owner";

  const permissions: PermissionsMap = chat?.permissions ?? {};
  const inviteCode = chat?.invite_code ?? "";
  const inviteEnabled = chat?.invite_enabled !== false;
  const inviteUrl = inviteCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/chat?invite=${inviteCode}` : "";


  const load = useCallback(async () => {
    if (!chat) return;
    setName(chat.name ?? "");
    setDescription(chat.description ?? "");

    const { data: rows } = await supabase
      .from("chat_members")
      .select("user_id, role, joined_at")
      .eq("chat_id", chat.id)
      .order("joined_at", { ascending: true });

    if (rows?.length) {
      const ids = rows.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));
      setMembers(rows.map((r) => ({ ...r, profile: pmap.get(r.user_id) ?? null })));
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
      .limit(30);
    setMedia(
      (msgs ?? [])
        .filter((m) => m.media_url)
        .map((m) => ({ url: m.media_url as string, type: m.message_type ?? "image" })),
    );
  }, [chat]);

  useEffect(() => {
    if (open && chat) {
      setTab("info");
      void load();
    }
  }, [open, chat, load]);

  // realtime sync
  useEffect(() => {
    if (!open || !chat) return;
    const ch = supabase
      .channel(`group-info:${chat.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats", filter: `id=eq.${chat.id}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members", filter: `chat_id=eq.${chat.id}` }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chat.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [open, chat, load]);

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
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB"); return; }
    setSavingAvatar(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      // Path MUST start with auth.uid() to satisfy the avatars bucket RLS policy.
      const path = `${user.id}/group-${chat.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("chats").update({ avatar_url: pub.publicUrl }).eq("id", chat.id);
      if (error) throw error;
      toast.success("Group photo updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      const denied = /row-level security|permission denied|not allowed|unauthorized/i.test(msg);
      toast.error(denied ? "You don't have permission to change this group's profile picture." : msg);
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
    setMemberAction(null);
  };

  const togglePromote = async (m: MemberRow) => {
    if (!chat) return;
    const nextRole = m.role === "admin" || m.role === "owner" ? "member" : "admin";
    const { error } = await supabase.from("chat_members").update({ role: nextRole }).eq("chat_id", chat.id).eq("user_id", m.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success(nextRole === "admin" ? "Promoted to admin" : "Demoted to member");
    setMemberAction(null);
  };

  const transferOwnership = async (m: MemberRow) => {
    if (!chat) return;
    setBusy(true);
    const rpc = supabase.rpc as unknown as (
      fn: "transfer_chat_ownership",
      args: { _chat_id: string; _new_owner_id: string },
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("transfer_chat_ownership", { _chat_id: chat.id, _new_owner_id: m.user_id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ownership transferred to ${m.profile?.display_name ?? "member"}`);
    setTransferTarget(null);
    setMemberAction(null);
  };

  const leaveGroup = async () => {
    if (!chat || !user) return;
    setBusy(true);
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", chat.id).eq("user_id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("You left the group");
    setConfirmLeave(false);
    onChatRemoved?.();
    onClose();
  };

  const deleteGroup = async () => {
    if (!chat) return;
    setBusy(true);
    const rpc = supabase.rpc as unknown as (
      fn: "delete_chat",
      args: { _chat_id: string },
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("delete_chat", { _chat_id: chat.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Group deleted");
    setConfirmDelete(false);
    onChatRemoved?.();
    onClose();
  };

  const setPermission = async (key: PermissionKey, value: PermissionScope) => {
    if (!chat) return;
    setSavingPerm(key);
    const rpc = supabase.rpc as unknown as (
      fn: "set_chat_permission",
      args: { _chat_id: string; _key: string; _value: string },
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("set_chat_permission", { _chat_id: chat.id, _key: key, _value: value });
    setSavingPerm(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Permission updated");
  };

  const rotateInvite = async () => {
    if (!chat) return;
    setBusy(true);
    const rpc = supabase.rpc as unknown as (fn: "rotate_chat_invite", args: { _chat_id: string }) =>
      Promise<{ data: string | null; error: { message: string } | null }>;
    const { error } = await rpc("rotate_chat_invite", { _chat_id: chat.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite link reset");
  };

  const toggleInviteEnabled = async (enabled: boolean) => {
    if (!chat) return;
    const rpc = supabase.rpc as unknown as (fn: "set_chat_invite_enabled", args: { _chat_id: string; _enabled: boolean }) =>
      Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("set_chat_invite_enabled", { _chat_id: chat.id, _enabled: enabled });
    if (error) { toast.error(error.message); return; }
    toast.success(enabled ? "Invite link enabled" : "Invite link disabled");
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch { toast.error("Could not copy"); }
  };

  const shareInvite = async () => {
    if (!inviteUrl) return;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: chat?.name ?? "Join group", text: `Join ${chat?.name ?? "this group"} on Aurix`, url: inviteUrl }); return; }
      catch { /* user cancelled */ }
    }
    void copyInvite();
  };

  const clearForMe = async () => {
    if (!chat || !user) return;
    const { error } = await clearChatForMe(chat.id, user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Chat cleared");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Info" },
    { id: "members", label: `Members (${members.length})` },
    { id: "media", label: "Media" },
    { id: "permissions", label: "Permissions" },
    { id: "settings", label: "Settings" },
  ];


  return (
    <AnimatePresence>
      {open && chat && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 top-12 z-50 rounded-t-3xl bg-background border-t border-glass-border overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
              <h2 className="font-display font-semibold">Group Info</h2>
              <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar + Name (always visible header) */}
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="relative inline-block" style={{ width: 96, height: 96 }}>
                <SmoothAvatar
                  src={chat.avatar_url ?? null}
                  size={96}
                  ringClassName="ring-2 ring-primary/40"
                  fallback={
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-3xl">
                      👥
                    </div>
                  }
                />
                {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
                {isAdmin && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={savingAvatar}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg disabled:opacity-50"
                    title="Change photo"
                  >
                    {savingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ""; }} />
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {editing === "name" ? (
                  <>
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                      className="bg-secondary rounded-lg px-3 py-1.5 text-center font-display font-bold text-xl focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <button onClick={() => void saveField("name")} className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
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

            {/* Tabs */}
            <div className="px-3 mb-3 flex gap-1 overflow-x-auto scrollbar-none">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    tab === t.id ? "bg-primary/20 text-neon" : "text-muted-foreground hover:bg-secondary/60"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* INFO TAB */}
            {tab === "info" && (
              <div className="mx-4 mb-6 p-4 glass-panel rounded-2xl">
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
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500}
                      placeholder="Add a group description..."
                      className="w-full bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditing(null); setDescription(chat.description ?? ""); }}
                        className="px-3 py-1 text-xs rounded-lg hover:bg-secondary">Cancel</button>
                      <button onClick={() => void saveField("description")} className="px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground">Save</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                    {chat.description || <span className="text-muted-foreground italic">No description yet</span>}
                  </p>
                )}
              </div>
            )}

            {/* MEMBERS TAB */}
            {tab === "members" && (
              <div className="mx-4 mb-6">
                {isAdmin && (
                  <button onClick={() => setAddOpen(true)}
                    className="w-full mb-2 flex items-center gap-3 px-3 py-3 glass-panel rounded-2xl hover:bg-secondary/60 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-neon flex items-center justify-center">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Add members</span>
                  </button>
                )}
                <div className="glass-panel rounded-2xl divide-y divide-border/40 overflow-hidden">
                  {members.map((m) => {
                    const isMe = m.user_id === user?.id;
                    const isRoleOwner = m.user_id === chat.created_by;
                    const isRoleAdmin = m.role === "admin" || m.role === "owner";
                    const canActOn = isAdmin && !isMe && !isRoleOwner;
                    return (
                      <button key={m.user_id} onClick={() => setMemberAction(m)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40">
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
                        {canActOn && <span className="text-[10px] text-muted-foreground">tap</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MEDIA TAB */}
            {tab === "media" && (
              <div className="mx-4 mb-6">
                {media.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center glass-panel rounded-2xl">
                    <ImageIcon className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    No media yet
                  </p>
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
            )}

            {/* PERMISSIONS TAB */}
            {tab === "permissions" && (
              <div className="mx-4 mb-6 space-y-3">
                <div className="glass-panel rounded-2xl p-4 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Who can</p>
                  <p className="text-[11px] text-muted-foreground">
                    Control what members are allowed to do in this group. Owner always has full control.
                  </p>
                </div>
                {([
                  { key: "send_messages", label: "Send messages", icon: <MessageCircle className="h-4 w-4" /> },
                  { key: "send_media", label: "Send photos & videos", icon: <ImgIcon className="h-4 w-4" /> },
                  { key: "send_voice", label: "Send voice messages", icon: <Mic className="h-4 w-4" /> },
                  { key: "add_members", label: "Add new members", icon: <UserPlus className="h-4 w-4" /> },
                  { key: "edit_info", label: "Edit group info", icon: <InfoIcon className="h-4 w-4" /> },
                  { key: "pin_messages", label: "Pin messages", icon: <PinIcon className="h-4 w-4" /> },
                ] as { key: PermissionKey; label: string; icon: React.ReactNode }[]).map((row) => (
                  <PermissionRow
                    key={row.key}
                    icon={row.icon}
                    label={row.label}
                    value={(permissions[row.key] ?? "everyone") as PermissionScope}
                    disabled={!isAdmin}
                    saving={savingPerm === row.key}
                    ownerOnly={row.key === "edit_info" ? false : false}
                    onChange={(v) => void setPermission(row.key, v)}
                  />
                ))}
                {!isAdmin && (
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    Only admins can change permissions.
                  </p>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {tab === "settings" && (
              <div className="mx-4 mb-6 space-y-4">
                {/* Invite link */}
                {isAdmin && (
                  <div className="glass-panel rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Link2 className="h-3 w-3" /> Invite link
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Anyone with this link can join {chat.name ?? "the group"}.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={inviteEnabled}
                          onChange={(e) => void toggleInviteEnabled(e.target.checked)} />
                        <span className="w-9 h-5 bg-secondary peer-checked:bg-primary/60 rounded-full relative transition-colors">
                          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${inviteEnabled ? "translate-x-4" : ""}`} />
                        </span>
                      </label>
                    </div>
                    {inviteEnabled ? (
                      <>
                        <div className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2 text-xs font-mono overflow-hidden">
                          <span className="truncate flex-1">{inviteUrl}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <MiniAction icon={<Copy className="h-4 w-4" />} label="Copy" onClick={() => void copyInvite()} />
                          <MiniAction icon={<Share2 className="h-4 w-4" />} label="Share" onClick={() => void shareInvite()} />
                          <MiniAction icon={<QrCode className="h-4 w-4" />} label="QR" onClick={() => setQrOpen(true)} />
                          <MiniAction icon={<RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />} label="Reset" onClick={() => void rotateInvite()} />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Invite link is currently disabled.</p>
                    )}
                  </div>
                )}

                {/* Group actions */}
                {isAdmin && (
                  <div className="space-y-2">
                    <SettingsRow icon={<Camera className="h-4 w-4" />} label="Change avatar"
                      onClick={() => fileRef.current?.click()} />
                    <SettingsRow icon={<Pencil className="h-4 w-4" />} label="Edit name"
                      onClick={() => { setTab("info"); setEditing("name"); }} />
                    <SettingsRow icon={<Pencil className="h-4 w-4" />} label="Edit description"
                      onClick={() => { setTab("info"); setEditing("description"); }} />
                    <SettingsRow icon={<UserPlus className="h-4 w-4" />} label="Add members"
                      onClick={() => { setTab("members"); setAddOpen(true); }} />
                    <SettingsRow icon={<Lock className="h-4 w-4" />} label="Permissions"
                      onClick={() => setTab("permissions")} hint={`${Object.keys(permissions).length || 6} settings`} />
                  </div>
                )}

                {/* Personal actions */}
                <div className="space-y-2">
                  <SettingsRow
                    icon={<Pin className="h-4 w-4" />}
                    label={memberState.is_pinned ? "Unpin group" : "Pin group"}
                    onClick={() => void memberState.update({ is_pinned: !memberState.is_pinned })}
                  />
                  <SettingsRow
                    icon={<BellOff className="h-4 w-4" />}
                    label={memberState.is_muted ? "Unmute notifications" : "Mute notifications"}
                    onClick={() => void memberState.update({ is_muted: !memberState.is_muted })}
                  />
                  <SettingsRow icon={<Eraser className="h-4 w-4" />} label="Clear chat for me"
                    onClick={() => void clearForMe()} />
                </div>

                {/* Danger zone */}
                <div className="space-y-2">
                  {isOwner && (
                    <SettingsRow icon={<ArrowRightLeft className="h-4 w-4" />} label="Transfer ownership"
                      onClick={() => setTab("members")} hint="Tap a member" />
                  )}
                  {!isOwner && me && (
                    <SettingsRow icon={<LogOut className="h-4 w-4" />} label="Leave group" destructive
                      onClick={() => setConfirmLeave(true)} />
                  )}
                  {isOwner && (
                    <SettingsRow icon={<Trash2 className="h-4 w-4" />} label="Delete group" destructive
                      onClick={() => setConfirmDelete(true)} />
                  )}
                </div>
              </div>
            )}

          </motion.div>

          {/* Member actions sheet */}
          <AnimatePresence>
            {memberAction && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setMemberAction(null)} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 360, damping: 32 }}
                  className="fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl bg-background border-t border-glass-border pb-[env(safe-area-inset-bottom,12px)]">
                  <div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
                  <div className="px-4 pt-2 pb-1 flex items-center gap-3">
                    {memberAction.profile?.avatar_url ? (
                      <img src={memberAction.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">
                        {memberAction.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{memberAction.profile?.display_name ?? "Member"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {memberAction.profile?.username ? `@${memberAction.profile.username}` : memberAction.role ?? "member"}
                      </p>
                    </div>
                  </div>
                  <div className="px-2 py-2 space-y-1">
                    <ActionItem icon={<UserIcon className="h-4 w-4" />} label="View profile"
                      onClick={() => { toast("Profile coming from member's DM"); setMemberAction(null); }} />
                    <ActionItem icon={<MessageSquare className="h-4 w-4" />} label="Message user"
                      onClick={async () => {
                        if (!memberAction || !user) return;
                        const rpc = supabase.rpc as unknown as (
                          fn: "get_or_create_direct_chat",
                          args: { _other_user_id: string },
                        ) => Promise<{ data: string | null; error: { message: string } | null }>;
                        const { error } = await rpc("get_or_create_direct_chat", { _other_user_id: memberAction.user_id });
                        if (error) { toast.error(error.message); return; }
                        toast.success("DM opened in your chat list");
                        setMemberAction(null);
                      }} />
                    {isAdmin && memberAction.user_id !== chat.created_by && memberAction.user_id !== user?.id && (
                      <>
                        <ActionItem icon={<Shield className="h-4 w-4" />}
                          label={memberAction.role === "admin" || memberAction.role === "owner" ? "Demote to member" : "Promote to admin"}
                          onClick={() => void togglePromote(memberAction)} />
                        {isOwner && (
                          <ActionItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Transfer ownership"
                            onClick={() => { setTransferTarget(memberAction); }} />
                        )}
                        <ActionItem icon={<UserMinus className="h-4 w-4" />} label="Remove from group" destructive
                          onClick={() => setRemoveTarget(memberAction)} />
                      </>
                    )}
                    <button onClick={() => setMemberAction(null)}
                      className="w-full mt-1 h-11 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Add members dialog */}
          <AddMembersDialog
            open={addOpen}
            onClose={() => setAddOpen(false)}
            chatId={chat.id}
            existingIds={members.map((m) => m.user_id)}
            onAdded={() => { setAddOpen(false); void load(); }}
          />

          <ConfirmDialog
            open={!!removeTarget}
            onClose={() => setRemoveTarget(null)}
            title="Remove member?"
            description={`${removeTarget?.profile?.display_name ?? "This member"} will be removed from the group.`}
            confirmLabel="Remove"
            destructive
            onConfirm={() => { if (removeTarget) void removeMember(removeTarget); }}
          />

          <ConfirmDialog
            open={!!transferTarget}
            onClose={() => setTransferTarget(null)}
            title="Transfer ownership?"
            description={`${transferTarget?.profile?.display_name ?? "This member"} will become the new owner. You'll keep admin rights.`}
            confirmLabel={busy ? "Transferring…" : "Transfer"}
            onConfirm={() => { if (transferTarget) void transferOwnership(transferTarget); }}
          />

          <ConfirmDialog
            open={confirmLeave}
            onClose={() => setConfirmLeave(false)}
            title="Leave group?"
            description="You won't receive any more messages from this group."
            confirmLabel={busy ? "Leaving…" : "Leave"}
            destructive
            onConfirm={() => void leaveGroup()}
          />

          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title="Delete this group?"
            description="The group, all messages, and all member data will be permanently deleted. This cannot be undone."
            confirmLabel={busy ? "Deleting…" : "Delete"}
            destructive
            onConfirm={() => void deleteGroup()}
          />

          {/* QR code dialog */}
          <AnimatePresence>
            {qrOpen && inviteUrl && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setQrOpen(false)} className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[81] mx-auto max-w-sm glass-panel rounded-3xl p-6 border border-glass-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold text-sm">Scan to join</h3>
                    <button onClick={() => setQrOpen(false)} className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                    <QRCodeSVG value={inviteUrl} size={220} level="M" />
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-3 truncate">{inviteUrl}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => void copyInvite()}
                      className="h-10 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 flex items-center justify-center gap-2">
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                    <button onClick={() => void shareInvite()}
                      className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
                      <Share2 className="h-4 w-4" /> Share
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingsRow({
  icon, label, onClick, destructive, hint,
}: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean; hint?: string }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 glass-panel rounded-2xl hover:bg-secondary/60 transition-colors text-left ${
        destructive ? "text-destructive" : ""
      }`}>
      <span className={`h-8 w-8 rounded-full flex items-center justify-center ${destructive ? "bg-destructive/15" : "bg-primary/15 text-neon"}`}>
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </button>
  );
}

function MiniAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 py-2 rounded-xl bg-secondary/60 hover:bg-secondary text-neon transition-colors">
      {icon}
      <span className="text-[10px] font-medium text-foreground/80">{label}</span>
    </button>
  );
}

function PermissionRow({
  icon, label, value, onChange, disabled, saving,
}: {
  icon: React.ReactNode; label: string; value: PermissionScope;
  onChange: (v: PermissionScope) => void; disabled?: boolean; saving?: boolean; ownerOnly?: boolean;
}) {
  const options: { value: PermissionScope; label: string }[] = [
    { value: "everyone", label: "Everyone" },
    { value: "admins", label: "Admins" },
    { value: "owner", label: "Owner" },
  ];
  return (
    <div className="glass-panel rounded-2xl p-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="h-8 w-8 rounded-full bg-primary/15 text-neon flex items-center justify-center">{icon}</span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <button key={o.value} disabled={disabled || saving} onClick={() => onChange(o.value)}
            className={`h-8 rounded-lg text-[11px] font-medium transition-colors ${
              value === o.value
                ? "bg-primary/25 text-neon border border-primary/40"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionItem({
  icon, label, onClick, destructive,
}: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl hover:bg-secondary text-left ${destructive ? "text-destructive" : ""}`}>
      <span className="h-7 w-7 rounded-full bg-secondary/70 flex items-center justify-center">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}


/* ───────────────────────── Add Members Dialog ───────────────────────── */

function AddMembersDialog({
  open, onClose, chatId, existingIds, onAdded,
}: {
  open: boolean; onClose: () => void; chatId: string;
  existingIds: string[]; onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const { results, loading } = useSearchUsers(query);
  const [selected, setSelected] = useState<ProfileRow[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (!open) { setQuery(""); setSelected([]); } }, [open]);

  const toggle = (p: ProfileRow) => {
    setSelected((prev) => prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]);
  };

  const add = async () => {
    if (!selected.length) return;
    setAdding(true);
    const rpc = supabase.rpc as unknown as (
      fn: "add_chat_members",
      args: { _chat_id: string; _user_ids: string[] },
    ) => Promise<{ data: number | null; error: { message: string } | null }>;
    const { data, error } = await rpc("add_chat_members", { _chat_id: chatId, _user_ids: selected.map((s) => s.id) });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${data ?? selected.length} member${(data ?? selected.length) === 1 ? "" : "s"}`);
    onAdded();
  };

  const visible = results.filter((r) => !existingIds.includes(r.id));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed inset-x-0 bottom-0 top-20 z-[71] rounded-t-3xl bg-background border-t border-glass-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-display font-semibold">Add members</h3>
              <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or @username"
                  className="w-full bg-secondary rounded-xl pl-9 pr-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.map((s) => (
                    <button key={s.id} onClick={() => toggle(s)}
                      className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-primary/20 text-neon text-xs">
                      {s.display_name ?? s.username ?? "user"}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              {loading && <p className="text-sm text-muted-foreground text-center py-6">Searching…</p>}
              {!loading && query.length >= 2 && visible.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
              )}
              {visible.map((p) => {
                const isSel = !!selected.find((s) => s.id === p.id);
                return (
                  <button key={p.id} onClick={() => toggle(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl ${isSel ? "bg-primary/15" : "hover:bg-secondary/60"}`}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">
                        {p.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{p.display_name ?? "Unknown"}</p>
                      {p.username && <p className="text-xs text-muted-foreground truncate">@{p.username}</p>}
                    </div>
                    {isSel && <Check className="h-4 w-4 text-neon" />}
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <button onClick={() => void add()} disabled={!selected.length || adding}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {adding ? "Adding…" : `Add ${selected.length || ""}`.trim()}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
