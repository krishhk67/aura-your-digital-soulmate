import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProfileRow } from "./useRealtimeChat";
import type { StoryGroup, StoryRow } from "./useStories";

/**
 * Live map of user_id -> StoryGroup for every user (including me) with at
 * least one active story. `has_unviewed` is scoped to the current viewer,
 * so the chat list can decide "ring vs no ring" and "tap opens story vs
 * tap opens profile preview" from a single source of truth.
 */
export function useAllStoryGroups() {
  const { user } = useAuth();
  const [map, setMap] = useState<Map<string, StoryGroup>>(new Map());

  const refresh = useCallback(async () => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: true });
    const all = (rows ?? []) as StoryRow[];
    if (all.length === 0) {
      setMap(new Map());
      return;
    }
    const userIds = [...new Set(all.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileRow]));

    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", user.id)
      .in("story_id", all.map((s) => s.id));
    const viewed = new Set((views ?? []).map((v) => v.story_id));

    const next = new Map<string, StoryGroup>();
    for (const uid of userIds) {
      const profile = pmap.get(uid);
      if (!profile) continue;
      const stories = all.filter((s) => s.user_id === uid);
      next.set(uid, {
        user: profile,
        stories,
        has_unviewed:
          uid === user.id ? false : stories.some((s) => !viewed.has(s.id)),
      });
    }
    setMap(next);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("all-story-groups")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "story_views",
          filter: `viewer_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return map;
}
