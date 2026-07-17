import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProfileRow } from "./useRealtimeChat";

type ProfilePatch = Partial<Pick<ProfileRow, "display_name" | "avatar_url" | "bio" | "status_text" | "is_online" | "ghost_mode">>;

interface CurrentProfileContextValue {
  profile: ProfileRow | null;
  loading: boolean;
  refreshProfile: () => Promise<ProfileRow | null>;
  updateProfile: (patch: ProfilePatch) => Promise<{ profile: ProfileRow | null; error: Error | null }>;
}

const CurrentProfileContext = createContext<CurrentProfileContextValue | null>(null);

export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setLoading(false);
    if (error || !data) {
      console.warn("[Aurix Profile] Failed to load profiles.avatar_url", error);
      setProfile(null);
      return null;
    }

    const next = data as ProfileRow;
    setProfile(next);
    return next;
  }, [user]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`current-profile:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setProfile(null);
            return;
          }
          setProfile(payload.new as ProfileRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    if (!user) return { profile: null, error: new Error("Not signed in") };

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) return { profile: null, error: new Error(error.message) };

    const next = data as ProfileRow;
    setProfile(next);
    return { profile: next, error: null };
  }, [user]);

  const value = useMemo<CurrentProfileContextValue>(() => ({
    profile,
    loading,
    refreshProfile,
    updateProfile,
  }), [profile, loading, refreshProfile, updateProfile]);

  return (
    <CurrentProfileContext.Provider value={value}>
      {children}
    </CurrentProfileContext.Provider>
  );
}

export function useCurrentProfile() {
  const context = useContext(CurrentProfileContext);
  if (!context) throw new Error("useCurrentProfile must be used within CurrentProfileProvider");
  return context;
}