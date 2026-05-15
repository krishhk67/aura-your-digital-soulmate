import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ChatMemberState {
  is_pinned: boolean;
  is_muted: boolean;
  cleared_at: string | null;
}

export function useChatMemberState(chatId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<ChatMemberState>({ is_pinned: false, is_muted: false, cleared_at: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!chatId || !user) { setLoading(false); return; }
    const { data } = await supabase
      .from("chat_members")
      .select("is_pinned,is_muted,cleared_at")
      .eq("chat_id", chatId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setState({ is_pinned: !!data.is_pinned, is_muted: !!data.is_muted, cleared_at: data.cleared_at ?? null });
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
