import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProfileRow } from "./useRealtimeChat";

export interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

export interface StoryGroup {
  user: ProfileRow;
  stories: StoryRow[];
  has_unviewed: boolean;
}

export function useStoriesFeed() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [myStories, setMyStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: true });
    const all = (rows ?? []) as StoryRow[];

    const mine = all.filter(s => s.user_id === user.id);
    const others = all.filter(s => s.user_id !== user.id);
    setMyStories(mine);

    if (others.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const userIds = [...new Set(others.map(s => s.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
    const pmap = new Map((profiles ?? []).map(p => [p.id, p as ProfileRow]));

    // viewed list for current user
    const storyIds = others.map(s => s.id);
    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", user.id)
      .in("story_id", storyIds);
    const viewed = new Set((views ?? []).map(v => v.story_id));

    const grouped: StoryGroup[] = userIds
      .map(uid => {
        const profile = pmap.get(uid);
        if (!profile) return null;
        const stories = others.filter(s => s.user_id === uid);
        return {
          user: profile,
          stories,
          has_unviewed: stories.some(s => !viewed.has(s.id)),
        };
      })
      .filter((g): g is StoryGroup => !!g)
      .sort((a, b) => Number(b.has_unviewed) - Number(a.has_unviewed));

    setGroups(grouped);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("stories-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "story_views", filter: `viewer_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { groups, myStories, loading, refresh };
}

export function usePostStory() {
  const { user } = useAuth();
  return useCallback(async (file: File, caption: string | null): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error("Not signed in") };
    const isVideo = file.type.startsWith("video/");
    const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("stories").upload(path, file, { upsert: false });
    if (upErr) return { error: new Error(upErr.message) };
    const { data: urlData } = supabase.storage.from("stories").getPublicUrl(path);
    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      media_url: urlData.publicUrl,
      media_type: isVideo ? "video" : "image",
      caption: caption?.trim() || null,
    });
    return { error: error ? new Error(error.message) : null };
  }, [user]);
}

export function useDeleteStory() {
  return useCallback(async (storyId: string) => {
    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    return { error: error ? new Error(error.message) : null };
  }, []);
}

export function useRecordStoryView() {
  const { user } = useAuth();
  return useCallback(async (storyId: string) => {
    if (!user) return;
    await supabase.from("story_views").upsert(
      { story_id: storyId, viewer_id: user.id },
      { onConflict: "story_id,viewer_id", ignoreDuplicates: true },
    );
  }, [user]);
}

export function useReactToStory() {
  const { user } = useAuth();
  return useCallback(async (storyId: string, reaction: string) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("story_reactions").upsert(
      { story_id: storyId, user_id: user.id, reaction },
      { onConflict: "story_id,user_id,reaction", ignoreDuplicates: true },
    );
    return { error: error ? new Error(error.message) : null };
  }, [user]);
}

export interface StoryViewerRow {
  viewer_id: string;
  viewed_at: string;
  profile?: ProfileRow;
}

export function useStoryAudience(storyId: string | null, enabled: boolean) {
  const [viewers, setViewers] = useState<StoryViewerRow[]>([]);
  const [reactions, setReactions] = useState<{ user_id: string; reaction: string; profile?: ProfileRow }[]>([]);

  const refresh = useCallback(async () => {
    if (!storyId || !enabled) return;
    const [{ data: vs }, { data: rs }] = await Promise.all([
      supabase.from("story_views").select("viewer_id,viewed_at").eq("story_id", storyId).order("viewed_at", { ascending: false }),
      supabase.from("story_reactions").select("user_id,reaction").eq("story_id", storyId),
    ]);
    const ids = [...new Set([...(vs ?? []).map(v => v.viewer_id), ...(rs ?? []).map(r => r.user_id)])];
    let pmap = new Map<string, ProfileRow>();
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      pmap = new Map((ps ?? []).map(p => [p.id, p as ProfileRow]));
    }
    setViewers((vs ?? []).map(v => ({ ...v, profile: pmap.get(v.viewer_id) })));
    setReactions((rs ?? []).map(r => ({ ...r, profile: pmap.get(r.user_id) })));
  }, [storyId, enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!storyId || !enabled) return;
    const ch = supabase.channel(`story-audience-${storyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_views", filter: `story_id=eq.${storyId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "story_reactions", filter: `story_id=eq.${storyId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [storyId, enabled, refresh]);

  return { viewers, reactions, refresh };
}

export function useUsersWithActiveStories() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("stories")
      .select("user_id")
      .gt("expires_at", new Date().toISOString());
    setIds(new Set((data ?? []).map(d => d.user_id)));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const ch = supabase.channel("stories-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);
  return ids;
}

export interface StoryPrivacy {
  stories_privacy: "everyone" | "contacts" | "nobody";
  story_replies_privacy: "everyone" | "contacts" | "nobody";
  story_hidden_from: string[];
}

export function useStoryPrivacy() {
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<StoryPrivacy>({
    stories_privacy: "everyone",
    story_replies_privacy: "everyone",
    story_hidden_from: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("stories_privacy,story_replies_privacy,story_hidden_from")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as Partial<StoryPrivacy>;
        setPrivacy({
          stories_privacy: (d.stories_privacy as StoryPrivacy["stories_privacy"]) ?? "everyone",
          story_replies_privacy: (d.story_replies_privacy as StoryPrivacy["story_replies_privacy"]) ?? "everyone",
          story_hidden_from: d.story_hidden_from ?? [],
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = useCallback(async (patch: Partial<StoryPrivacy>) => {
    if (!user) return;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    await supabase.from("user_settings").upsert(
      { user_id: user.id, ...next },
      { onConflict: "user_id" },
    );
  }, [user, privacy]);

  return { privacy, loading, update };
}
