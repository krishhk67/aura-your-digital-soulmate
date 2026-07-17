import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProfileRow } from "./useRealtimeChat";

export interface ReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at?: string;
}

export type ReactionScope = "chat" | "room";

const TABLE: Record<ReactionScope, "message_reactions" | "room_message_reactions"> = {
  chat: "message_reactions",
  room: "room_message_reactions",
};

/**
 * Reactions for every message in a conversation, keyed by message_id.
 * Realtime: full refetch on any change to keep code tiny and correct.
 */
export function useMessageReactions(
  scope: ReactionScope,
  scopeId: string | null,
  messageIds: string[],
) {
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const table = TABLE[scope];

  // Stable key derived from message ids so the effect doesn't refetch on
  // every parent re-render.
  const idsKey = useMemo(() => messageIds.slice().sort().join(","), [messageIds]);

  const refetch = useCallback(async () => {
    if (!scopeId || messageIds.length === 0) { setRows([]); return; }
    const { data } = await supabase
      .from(table)
      .select("id,message_id,user_id,emoji,created_at")
      .in("message_id", messageIds);
    setRows((data ?? []) as ReactionRow[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, scopeId, idsKey]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!scopeId) return;
    const ch = supabase
      .channel(`reactions:${table}:${scopeId}:${Math.random().toString(36).slice(2, 6)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        const row = (payload.new ?? payload.old) as { message_id?: string } | null;
        if (row?.message_id && messageIds.includes(row.message_id)) refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, scopeId, idsKey]);

  const byMessage = useMemo(() => {
    const m = new Map<string, ReactionRow[]>();
    for (const r of rows) {
      const arr = m.get(r.message_id) ?? [];
      arr.push(r);
      m.set(r.message_id, arr);
    }
    return m;
  }, [rows]);

  return { byMessage, refetch };
}

/** Toggle a single (user, emoji) on a message. Returns whether it was added. */
export function useToggleReaction(scope: ReactionScope) {
  const { user } = useAuth();
  const table = TABLE[scope];
  return useCallback(async (messageId: string, emoji: string): Promise<{ added: boolean; error: Error | null }> => {
    if (!user) return { added: false, error: new Error("Sign in required") };
    const { data: existing } = await supabase
      .from(table)
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabase.from(table).delete().eq("id", existing.id);
      return { added: false, error: error ? new Error(error.message) : null };
    }
    const { error } = await supabase.from(table).insert({
      message_id: messageId, user_id: user.id, emoji,
    });
    return { added: true, error: error ? new Error(error.message) : null };
  }, [user, table]);
}

/** Fetch profiles for a set of user ids (small helper for the "who reacted" sheet). */
export async function fetchReactionProfiles(userIds: string[]): Promise<Record<string, ProfileRow>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase.from("profiles").select("*").in("id", userIds);
  const map: Record<string, ProfileRow> = {};
  (data ?? []).forEach(p => { map[(p as ProfileRow).id] = p as ProfileRow; });
  return map;
}
