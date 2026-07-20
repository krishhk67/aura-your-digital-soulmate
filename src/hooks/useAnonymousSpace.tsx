import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AnonSpace {
  id: string;
  group_chat_id: string;
  title: string | null;
  max_participants: number | null;
  auto_close_at: string | null;
  created_by: string;
  created_at: string;
  destroyed_at: string | null;
}

export interface AnonParticipant {
  id: string;
  space_id: string;
  user_id: string;
  alias: string;
  joined_at: string;
  left_at: string | null;
}

export interface AnonMessage {
  id: string;
  space_id: string;
  sender_participant_id: string;
  content: string | null;
  media_url: string | null;
  message_type: string;
  reply_to: string | null;
  created_at: string;
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

/** Watch the newest live anonymous space for a group chat. */
export function useActiveSpaceForChat(chatId: string | null) {
  const [space, setSpace] = useState<AnonSpace | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  const load = useCallback(async () => {
    if (!chatId) { setSpace(null); return; }
    const { data } = await supabase
      .from("anonymous_spaces")
      .select("*")
      .eq("group_chat_id", chatId)
      .is("destroyed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSpace((data as AnonSpace | null) ?? null);
    if (data) {
      const { count } = await supabase
        .from("anonymous_participants")
        .select("id", { count: "exact", head: true })
        .eq("space_id", (data as AnonSpace).id)
        .is("left_at", null);
      setParticipantCount(count ?? 0);
    } else setParticipantCount(0);
  }, [chatId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`anon-space-watch:${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "anonymous_spaces", filter: `group_chat_id=eq.${chatId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "anonymous_participants" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, load]);

  return { space, participantCount, refresh: load };
}

/** Full state + realtime for one anonymous space (participants, messages, my identity). */
export function useAnonymousSpace(spaceId: string | null) {
  const { user } = useAuth();
  const [space, setSpace] = useState<AnonSpace | null>(null);
  const [participants, setParticipants] = useState<AnonParticipant[]>([]);
  const [messages, setMessages] = useState<AnonMessage[]>([]);
  const [me, setMe] = useState<AnonParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [destroyed, setDestroyed] = useState(false);

  const load = useCallback(async () => {
    if (!spaceId) {
      setSpace(null);
      setParticipants([]);
      setMessages([]);
      setMe(null);
      setDestroyed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: sp }, { data: parts }, { data: msgs }] = await Promise.all([
      supabase.from("anonymous_spaces").select("*").eq("id", spaceId).maybeSingle(),
      supabase.from("anonymous_participants").select("*").eq("space_id", spaceId).is("left_at", null),
      supabase.from("anonymous_messages").select("*").eq("space_id", spaceId).order("created_at", { ascending: true }),
    ]);
    const nextSpace = sp as AnonSpace | null;
    const isDestroyed = !nextSpace || !!nextSpace.destroyed_at;
    if (isDestroyed) {
      setSpace(nextSpace);
      setParticipants([]);
      setMessages([]);
      setMe(null);
      setDestroyed(true);
      setLoading(false);
      console.info("[AnonymousSpace] load detected closed space", { spaceId, found: !!nextSpace, destroyed_at: nextSpace?.destroyed_at ?? null });
      return;
    }
    const activeParticipants = (parts ?? []) as AnonParticipant[];
    setSpace(nextSpace);
    setParticipants(activeParticipants);
    setMessages((msgs ?? []) as AnonMessage[]);
    setMe(user ? activeParticipants.find(p => p.user_id === user.id) ?? null : null);
    setDestroyed(false);
    setLoading(false);
  }, [spaceId, user]);

  useEffect(() => {
    setSpace(null);
    setParticipants([]);
    setMessages([]);
    setMe(null);
    setDestroyed(false);
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase
      .channel(`anon-space:${spaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "anonymous_messages", filter: `space_id=eq.${spaceId}` },
        (payload) => setMessages(prev => [...prev, payload.new as AnonMessage]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "anonymous_messages", filter: `space_id=eq.${spaceId}` },
        (payload) => setMessages(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id)))
      .on("postgres_changes", { event: "*", schema: "public", table: "anonymous_participants", filter: `space_id=eq.${spaceId}` },
        () => void load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "anonymous_spaces", filter: `id=eq.${spaceId}` },
        () => {
          console.info("[AnonymousSpace] room status changed", { spaceId, status: "deleted" });
          setSpace(null);
          setParticipants([]);
          setMessages([]);
          setMe(null);
          setDestroyed(true);
          setLoading(false);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "anonymous_spaces", filter: `id=eq.${spaceId}` },
        (payload) => {
          const next = payload.new as AnonSpace;
          if (next.destroyed_at) {
            console.info("[AnonymousSpace] room status changed", { spaceId, status: "destroyed", destroyed_at: next.destroyed_at });
            setSpace(next);
            setParticipants([]);
            setMessages([]);
            setMe(null);
            setDestroyed(true);
            setLoading(false);
          } else {
            setSpace(next);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, load]);

  const send = useCallback(async (content: string) => {
    if (!me || !spaceId || !content.trim()) return { error: new Error("Not ready") };
    const { error } = await supabase.from("anonymous_messages").insert({
      space_id: spaceId,
      sender_participant_id: me.id,
      content: content.trim(),
      message_type: "text",
    });
    return { error: error ? new Error(error.message) : null };
  }, [me, spaceId]);

  return { space, participants, messages, me, loading, destroyed, send, refresh: load };
}

export function useAnonymousSpaceActions() {
  const create = useCallback(async (args: { groupChatId: string; title?: string; maxParticipants?: number; autoCloseMinutes?: number }) => {
    const { data, error } = await (supabase.rpc as unknown as Rpc)("create_anonymous_space", {
      _group_chat_id: args.groupChatId,
      _title: args.title ?? null,
      _max_participants: args.maxParticipants ?? null,
      _auto_close_minutes: args.autoCloseMinutes ?? null,
    });
    return { spaceId: (data as string | null) ?? null, error: error ? new Error(error.message) : null };
  }, []);

  const join = useCallback(async (spaceId: string, customAlias?: string) => {
    const { data, error } = await (supabase.rpc as unknown as Rpc)("join_anonymous_space", {
      _space_id: spaceId,
      _custom_alias: customAlias ?? null,
    });
    const rows = data as Array<{ participant_id: string; alias: string }> | null;
    return {
      participantId: rows?.[0]?.participant_id ?? null,
      alias: rows?.[0]?.alias ?? null,
      error: error ? new Error(error.message) : null,
    };
  }, []);

  const leave = useCallback(async (spaceId: string) => {
    const { error } = await (supabase.rpc as unknown as Rpc)("leave_anonymous_space", { _space_id: spaceId });
    return { error: error ? new Error(error.message) : null };
  }, []);

  return { create, join, leave };
}
