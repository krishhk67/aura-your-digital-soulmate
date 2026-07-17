import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProfileRow } from "./useRealtimeChat";

export interface RoomRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  is_private: boolean;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomMemberRow {
  id: string;
  room_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  profile?: ProfileRow;
}

export interface RoomMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  reply_to: string | null;
  created_at: string;
  sender?: ProfileRow;
}

export interface RoomReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

type JoinRoomRpc = (
  fn: "join_room" | "join_room_by_code",
  args: Record<string, string>,
) => Promise<{ data: string | null; error: { message: string } | null }>;

export function useRooms(search = "") {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<(RoomRow & { member_count: number; is_member: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("rooms").select("*").order("updated_at", { ascending: false });
    if (search.trim()) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    const { data: roomsData } = await q;
    if (!roomsData) { setRooms([]); setLoading(false); return; }

    const ids = roomsData.map(r => r.id);
    const { data: members } = await supabase.from("room_members").select("room_id,user_id").in("room_id", ids);
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    (members ?? []).forEach(m => {
      counts.set(m.room_id, (counts.get(m.room_id) ?? 0) + 1);
      if (m.user_id === user.id) mine.add(m.room_id);
    });

    setRooms(roomsData.map(r => ({
      ...(r as RoomRow),
      member_count: counts.get(r.id) ?? 0,
      is_member: mine.has(r.id),
    })));
    setLoading(false);
  }, [user, search]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const chanId = useMemo(() => crypto.randomUUID(), []);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`rooms-global:${chanId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members" }, () => fetchRooms())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchRooms, chanId]);

  return { rooms, loading, refetch: fetchRooms };
}

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [members, setMembers] = useState<RoomMemberRow[]>([]);

  const fetch = useCallback(async () => {
    if (!roomId) { setRoom(null); setMembers([]); return; }
    const { data: r } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    setRoom((r as RoomRow) ?? null);
    const { data: ms } = await supabase.from("room_members").select("*").eq("room_id", roomId);
    if (ms?.length) {
      const ids = ms.map(m => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const pmap = new Map((profs ?? []).map(p => [p.id, p as ProfileRow]));
      setMembers(ms.map(m => ({ ...(m as RoomMemberRow), profile: pmap.get(m.user_id) })));
    } else setMembers([]);
  }, [roomId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => fetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, fetch]);

  return { room, members, refetch: fetch };
}

export function useRoomMessages(roomId: string | null) {
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const cache = useRef<Record<string, ProfileRow>>({});

  const fetchMsgs = useCallback(async () => {
    if (!roomId) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("room_messages").select("*").eq("room_id", roomId)
      .order("created_at", { ascending: true }).limit(200);
    if (!data) { setMessages([]); setLoading(false); return; }
    const senderIds = [...new Set(data.map(m => m.sender_id))].filter(id => !cache.current[id]);
    if (senderIds.length) {
      const { data: profs } = await supabase.from("profiles").select("*").in("id", senderIds);
      profs?.forEach(p => { cache.current[p.id] = p as ProfileRow; });
    }
    setMessages(data.map(m => ({ ...(m as RoomMessageRow), sender: cache.current[m.sender_id] })));
    setLoading(false);
  }, [roomId]);

  useEffect(() => { fetchMsgs(); }, [fetchMsgs]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`room-msgs:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, async (payload) => {
        const m = payload.new as RoomMessageRow;
        if (!cache.current[m.sender_id]) {
          const { data: p } = await supabase.from("profiles").select("*").eq("id", m.sender_id).maybeSingle();
          if (p) cache.current[p.id] = p as ProfileRow;
        }
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, { ...m, sender: cache.current[m.sender_id] }]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const old = payload.old as { id?: string };
        if (old?.id) setMessages(prev => prev.filter(m => m.id !== old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  return { messages, loading };
}

export function useRoomActions() {
  const { user } = useAuth();

  const createRoom = useCallback(async (input: { name: string; description?: string; is_private?: boolean; avatar?: File | null }) => {
    if (!user) return { error: new Error("Sign in required"), roomId: null as string | null };
    let avatar_url: string | null = null;
    if (input.avatar) {
      const ext = input.avatar.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatars/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("room-media").upload(path, input.avatar);
      if (upErr) return { error: new Error(upErr.message), roomId: null };
      avatar_url = path;
    }
    const { data, error } = await supabase.from("rooms").insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_private: !!input.is_private,
      owner_id: user.id,
      avatar_url,
    }).select("id").single();
    if (error) return { error: new Error(error.message), roomId: null };
    return { error: null, roomId: data.id as string };
  }, [user]);

  const joinRoom = useCallback(async (roomId: string, inviteCode?: string) => {
    const { error } = await (supabase.rpc as unknown as JoinRoomRpc)("join_room", { _room_id: roomId, _invite_code: inviteCode ?? "" });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const joinByCode = useCallback(async (code: string) => {
    const { data, error } = await (supabase.rpc as unknown as JoinRoomRpc)("join_room_by_code", { _invite_code: code });
    return { error: error ? new Error(error.message) : null, roomId: data };
  }, []);

  const leaveRoom = useCallback(async (roomId: string) => {
    if (!user) return { error: new Error("Sign in required") };
    const { error } = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", user.id);
    return { error: error ? new Error(error.message) : null };
  }, [user]);

  const sendMessage = useCallback(async (roomId: string, content: string, opts?: { type?: string; mediaUrl?: string | null; replyTo?: string | null }) => {
    if (!user) return { error: new Error("Sign in required") };
    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
      sender_id: user.id,
      content: content || null,
      message_type: opts?.type ?? "text",
      media_url: opts?.mediaUrl ?? null,
      reply_to: opts?.replyTo ?? null,
    });
    return { error: error ? new Error(error.message) : null };
  }, [user]);

  const uploadMedia = useCallback(async (file: Blob, ext: string) => {
    if (!user) return { error: new Error("Sign in required"), path: null as string | null };
    const path = `${user.id}/media/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("room-media").upload(path, file);
    if (error) return { error: new Error(error.message), path: null };
    return { error: null, path };
  }, [user]);

  const deleteRoom = useCallback(async (roomId: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    return { error: error ? new Error(error.message) : null };
  }, []);

  const updateRoom = useCallback(async (roomId: string, patch: Partial<Pick<RoomRow, "name" | "description" | "avatar_url" | "is_private">>) => {
    const { error } = await supabase.from("rooms").update(patch).eq("id", roomId);
    return { error: error ? new Error(error.message) : null };
  }, []);

  const setRole = useCallback(async (roomId: string, userId: string, role: "owner" | "admin" | "member") => {
    const { error } = await supabase.from("room_members").update({ role }).eq("room_id", roomId).eq("user_id", userId);
    return { error: error ? new Error(error.message) : null };
  }, []);

  const removeMember = useCallback(async (roomId: string, userId: string) => {
    const { error } = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    return { error: error ? new Error(error.message) : null };
  }, []);

  return { createRoom, joinRoom, joinByCode, leaveRoom, sendMessage, uploadMedia, deleteRoom, updateRoom, setRole, removeMember };
}

// Signed URL helper for room-media bucket
const signedCache = new Map<string, { url: string; expires: number }>();
export async function signedRoomMedia(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cached = signedCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data } = await supabase.storage.from("room-media").createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, expires: Date.now() + 3500_000 });
  return data.signedUrl;
}

export function useSignedRoomMedia(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    signedRoomMedia(path ?? null).then(u => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [path]);
  return url;
}
