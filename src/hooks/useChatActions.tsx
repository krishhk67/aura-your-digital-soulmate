import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ChatMemberState {
  is_pinned: boolean;
  is_muted: boolean;
  cleared_at: string | null;
  theme: string | null;
}

export function useChatMemberState(chatId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<ChatMemberState>({ is_pinned: false, is_muted: false, cleared_at: null, theme: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!chatId || !user) { setLoading(false); return; }
    const { data } = await supabase
      .from("chat_members")
      .select("is_pinned,is_muted,cleared_at,theme")
      .eq("chat_id", chatId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const d = data as { is_pinned?: boolean; is_muted?: boolean; cleared_at?: string | null; theme?: string | null };
      setState({
        is_pinned: !!d.is_pinned,
        is_muted: !!d.is_muted,
        cleared_at: d.cleared_at ?? null,
        theme: d.theme ?? null,
      });
    }
    setLoading(false);
  }, [chatId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = useCallback(async (patch: Partial<ChatMemberState>) => {
    if (!chatId || !user) return { error: new Error("Not signed in") };
    const { error } = await supabase
      .from("chat_members")
      .update(patch)
      .eq("chat_id", chatId)
      .eq("user_id", user.id);
    if (!error) setState(prev => ({ ...prev, ...patch }));
    return { error: error ? new Error(error.message) : null };
  }, [chatId, user]);

  return { ...state, loading, refresh, update };
}

export function useChatDisappear(chatId: string | null) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!chatId) { setLoading(false); return; }
    const { data } = await supabase
      .from("chats")
      .select("disappear_seconds")
      .eq("id", chatId)
      .maybeSingle();
    setSeconds((data as { disappear_seconds?: number | null } | null)?.disappear_seconds ?? null);
    setLoading(false);
  }, [chatId]);

  useEffect(() => { refresh(); }, [refresh]);

  const setDisappear = useCallback(async (s: number | null) => {
    if (!chatId) return { error: new Error("No chat") };
    const { error } = await supabase.from("chats").update({ disappear_seconds: s }).eq("id", chatId);
    if (!error) setSeconds(s);
    return { error: error ? new Error(error.message) : null };
  }, [chatId]);

  return { seconds, loading, setDisappear, refresh };
}

export function useBlockUser() {
  const { user } = useAuth();

  const isBlocked = useCallback(async (otherUserId: string) => {
    if (!user) return false;
    const { data } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUserId)
      .maybeSingle();
    return !!data;
  }, [user]);

  const block = useCallback(async (otherUserId: string) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: otherUserId });
    return { error: error ? new Error(error.message) : null };
  }, [user]);

  const unblock = useCallback(async (otherUserId: string) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", otherUserId);
    return { error: error ? new Error(error.message) : null };
  }, [user]);

  return { isBlocked, block, unblock };
}

export function useReportUser() {
  const { user } = useAuth();
  return useCallback(async (params: { reportedUserId: string; chatId?: string | null; reason: string; details?: string }) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: params.reportedUserId,
      chat_id: params.chatId ?? null,
      reason: params.reason,
      details: params.details ?? null,
    });
    return { error: error ? new Error(error.message) : null };
  }, [user]);
}

export async function clearChatForMe(chatId: string, userId: string) {
  return supabase
    .from("chat_members")
    .update({ cleared_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
}
