import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatRow {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  disappear_seconds?: number | null;
  description?: string | null;
  created_by?: string | null;
}

export interface ChatMemberRow {
  id: string;
  chat_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  reply_to: string | null;
  is_edited: boolean;
  created_at: string;
  expires_at?: string | null;
}

interface DirectChatResult {
  chatId: string | null;
  error: Error | null;
}

type DirectChatRpc = (
  fn: "get_or_create_direct_chat",
  args: { _other_user_id: string },
) => Promise<{ data: string | null; error: { message: string; code?: string; details?: string; hint?: string } | null }>;

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status_text: string | null;
  is_online: boolean;
  last_seen: string;
  ghost_mode?: boolean;
}


export function useMyChats(opts?: { hiddenOnly?: boolean }) {
  const { user } = useAuth();
  const hiddenOnly = !!opts?.hiddenOnly;
  const [chats, setChats] = useState<(ChatRow & { last_message?: MessageRow; other_user?: ProfileRow; unread_count?: number; is_pinned?: boolean; is_muted?: boolean; cleared_at?: string | null; is_blocked?: boolean; is_hidden?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    // Get chat memberships (with per-user state)
    const { data: memberships } = await supabase
      .from("chat_members")
      .select("chat_id,is_pinned,is_muted,cleared_at,is_hidden")
      .eq("user_id", user.id);

    if (!memberships?.length) { setChats([]); setLoading(false); return; }

    // Pull blocked users so we can hide their DMs
    const { data: blockedRows } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    const blockedIds = new Set((blockedRows ?? []).map(b => b.blocked_id));

    // Filter memberships by hidden mode
    const filteredMemberships = memberships.filter(m => hiddenOnly ? m.is_hidden : !m.is_hidden);
    if (!filteredMemberships.length) { setChats([]); setLoading(false); return; }
    const memberMap = new Map(filteredMemberships.map(m => [m.chat_id, m]));
    const chatIds = filteredMemberships.map(m => m.chat_id);

    const { data: chatRows } = await supabase
      .from("chats")
      .select("*")
      .in("id", chatIds)
      .order("updated_at", { ascending: false });

    if (!chatRows) { setChats([]); setLoading(false); return; }

    // Get last message for each chat (respecting cleared_at)
    const enriched = await Promise.all(chatRows.map(async (chat) => {
      const meta = memberMap.get(chat.id);
      let q = supabase.from("messages").select("*").eq("chat_id", chat.id);
      if (meta?.cleared_at) q = q.gt("created_at", meta.cleared_at);
      const { data: msgs } = await q.order("created_at", { ascending: false }).limit(1);

      // For DMs, get the other user's profile
      let other_user: ProfileRow | undefined;
      if (!chat.is_group) {
        const { data: members } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", chat.id)
          .neq("user_id", user.id);
        if (members?.[0]) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", members[0].user_id)
            .single();
          other_user = profile as ProfileRow | undefined ?? undefined;
        }
      }

      return {
        ...chat,
        last_message: msgs?.[0] as MessageRow | undefined,
        other_user,
        is_pinned: meta?.is_pinned ?? false,
        is_muted: meta?.is_muted ?? false,
        cleared_at: meta?.cleared_at ?? null,
        is_hidden: meta?.is_hidden ?? false,
        is_blocked: !!(other_user && blockedIds.has(other_user.id)),
      };
    }));

    // Blocked chats stay visible — only restrict interaction inside.
    enriched.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
    });

    setChats(enriched as typeof chats);
    setLoading(false);
  }, [user, hiddenOnly]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // Realtime: listen to chat_members and messages changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-chats:${user.id}:${hiddenOnly ? "hidden" : "main"}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => fetchChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members" }, () => fetchChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => fetchChats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchChats]);

  return { chats, loading, refetch: fetchChats };
}

export function useChatMessages(chatId: string | null) {
  const [messages, setMessages] = useState<(MessageRow & { sender?: ProfileRow })[]>([]);
  const [loading, setLoading] = useState(true);
  const profileCache = useRef<Record<string, ProfileRow>>({});

  const fetchMessages = useCallback(async () => {
    if (!chatId) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    setMessages([]);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    console.info("[Aurix] messages fetched", { chatId, count: data?.length ?? 0 });

    if (!data) { setMessages([]); setLoading(false); return; }

    // Fetch unique sender profiles
    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const uncached = senderIds.filter(id => !profileCache.current[id]);
    if (uncached.length) {
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", uncached);
      profiles?.forEach(p => { profileCache.current[p.id] = p as ProfileRow; });
    }

    setMessages(data.map(m => ({ ...m, sender: profileCache.current[m.sender_id] })) as typeof messages);
    setLoading(false);
  }, [chatId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime messages — handle inserts, updates and deletes (for disappearing)
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, async (payload) => {
        const msg = payload.new as MessageRow;
        if (!profileCache.current[msg.sender_id]) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", msg.sender_id).single();
          if (profile) profileCache.current[profile.id] = profile as ProfileRow;
        }
        setMessages(prev => [...prev, { ...msg, sender: profileCache.current[msg.sender_id] }]);
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const old = payload.old as { id?: string };
        if (old?.id) {
          console.info("[Aurix] message expired/deleted", { id: old.id });
          setMessages(prev => prev.filter(m => m.id !== old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);


  return { messages, loading, refetch: fetchMessages };
}

export function useSendMessage() {
  const { user } = useAuth();

  return useCallback(async (chatId: string, content: string, type = "text") => {
    if (!user || !content.trim()) return { error: new Error("You must be signed in to send messages.") };
    console.info("[Aurix] sending message", { chatId, type });
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      content: content.trim(),
      message_type: type,
    });
    if (error) {
      console.error("[Aurix] send message failed", error);
      return { error: new Error(error.message) };
    }
    return { error: null };
  }, [user]);
}

export function useCreateChat() {
  const { user } = useAuth();

  return useCallback(async (otherUserId: string): Promise<DirectChatResult> => {
    if (!user) return { chatId: null, error: new Error("You must be signed in to start a conversation.") };

    console.info("[Aurix] starting direct chat", { currentUserId: user.id, otherUserId });
    const { data, error } = await (supabase.rpc as unknown as DirectChatRpc)("get_or_create_direct_chat", {
      _other_user_id: otherUserId,
    });

    if (error || !data) {
      console.error("[Aurix] direct chat creation failed", error);
      return { chatId: null, error: new Error(error?.message ?? "Could not start this conversation.") };
    }

    console.info("[Aurix] direct chat ready", { chatId: data });
    return { chatId: data, error: null };
  }, [user]);
}

export function useOnlineProfiles() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_online", true);
      if (data) setProfiles(data as ProfileRow[]);
    };
    fetch();

    const channel = supabase
      .channel("online-profiles")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return profiles;
}

export function useSearchUsers(query: string) {
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      setResults((data ?? []) as ProfileRow[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user]);

  return { results, loading };
}
