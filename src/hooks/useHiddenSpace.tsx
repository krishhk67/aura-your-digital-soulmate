import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface HiddenSpaceSettings {
  user_id: string;
  recovery_email: string | null;
  auto_lock_seconds: number;
  notification_mode: "full" | "generic" | "off";
  wallpaper_url: string | null;
  theme: Record<string, unknown>;
  has_pin: boolean;
}

interface Ctx {
  configured: boolean;
  unlocked: boolean;
  settings: HiddenSpaceSettings | null;
  loading: boolean;
  unlock: (keyword: string) => Promise<boolean>;
  lock: () => void;
  setup: (args: { keyword: string; recovery_email?: string; pin?: string; auto_lock_seconds?: number; notification_mode?: "full" | "generic" | "off" }) => Promise<{ error: Error | null }>;
  updateAppearance: (args: { wallpaper_url?: string | null; theme?: Record<string, unknown> }) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
  moveChatIn: (chatId: string) => Promise<{ error: Error | null }>;
  moveChatOut: (chatId: string) => Promise<{ error: Error | null }>;
  isHidden: (chatId: string) => boolean;
  bumpActivity: () => void;
}

const HiddenSpaceCtx = createContext<Ctx | null>(null);

export function HiddenSpaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<HiddenSpaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const lastActivity = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setSettings(null); setLoading(false); return; }
    const { data } = await supabase
      .from("hidden_space_settings")
      .select("user_id,recovery_email,auto_lock_seconds,notification_mode,wallpaper_url,theme,pin_hash")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setSettings({
        user_id: data.user_id,
        recovery_email: data.recovery_email,
        auto_lock_seconds: data.auto_lock_seconds,
        notification_mode: data.notification_mode as HiddenSpaceSettings["notification_mode"],
        wallpaper_url: data.wallpaper_url,
        theme: (data.theme as Record<string, unknown>) ?? {},
        has_pin: !!data.pin_hash,
      });
    } else setSettings(null);
    // Fetch hidden chat ids for quick lookup
    const { data: hidden } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", user.id)
      .eq("is_hidden", true);
    setHiddenChatIds(new Set((hidden ?? []).map(h => h.chat_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime updates for hidden flags
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("hidden-space")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members", filter: `user_id=eq.${user.id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "hidden_space_settings", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const lock = useCallback(() => { setUnlocked(false); }, []);

  // Auto-lock on visibility change / blur / inactivity
  useEffect(() => {
    if (!unlocked) return;
    const onHide = () => { if (document.hidden) lock(); };
    const onBlur = () => lock();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    lastActivity.current = Date.now();
    const timeout = (settings?.auto_lock_seconds ?? 60) * 1000;
    if (timeout > 0) {
      timerRef.current = setInterval(() => {
        if (Date.now() - lastActivity.current > timeout) lock();
      }, 5000);
    }
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [unlocked, settings?.auto_lock_seconds, lock]);

  const bumpActivity = useCallback(() => { lastActivity.current = Date.now(); }, []);

  const unlock = useCallback(async (keyword: string) => {
    if (!user || !settings) return false;
    const { data, error } = await supabase.rpc("verify_hidden_keyword" as never, { _keyword: keyword } as never);
    if (error || !data) return false;
    setUnlocked(true);
    lastActivity.current = Date.now();
    return true;
  }, [user, settings]);

  const setup: Ctx["setup"] = useCallback(async ({ keyword, recovery_email, pin, auto_lock_seconds, notification_mode }) => {
    const { error } = await supabase.rpc("setup_hidden_space" as never, {
      _keyword: keyword,
      _recovery_email: recovery_email ?? null,
      _pin: pin ?? null,
      _auto_lock_seconds: auto_lock_seconds ?? 60,
      _notification_mode: notification_mode ?? "generic",
    } as never);
    await refresh();
    return { error: error ? new Error(error.message) : null };
  }, [refresh]);

  const updateAppearance: Ctx["updateAppearance"] = useCallback(async ({ wallpaper_url, theme }) => {
    const { error } = await supabase.rpc("update_hidden_space_appearance" as never, {
      _wallpaper_url: wallpaper_url ?? null,
      _theme: theme ?? null,
    } as never);
    await refresh();
    return { error: error ? new Error(error.message) : null };
  }, [refresh]);

  const setChatHidden = useCallback(async (chatId: string, hidden: boolean) => {
    const { error } = await supabase.rpc("set_chat_hidden" as never, { _chat_id: chatId, _hidden: hidden } as never);
    await refresh();
    return { error: error ? new Error(error.message) : null };
  }, [refresh]);

  const value = useMemo<Ctx>(() => ({
    configured: !!settings,
    unlocked,
    settings,
    loading,
    unlock, lock, setup, updateAppearance, refresh,
    moveChatIn: (id) => setChatHidden(id, true),
    moveChatOut: (id) => setChatHidden(id, false),
    isHidden: (id) => hiddenChatIds.has(id),
    bumpActivity,
  }), [settings, unlocked, loading, unlock, lock, setup, updateAppearance, refresh, setChatHidden, hiddenChatIds, bumpActivity]);

  return <HiddenSpaceCtx.Provider value={value}>{children}</HiddenSpaceCtx.Provider>;
}

export function useHiddenSpace() {
  const ctx = useContext(HiddenSpaceCtx);
  if (!ctx) throw new Error("useHiddenSpace must be used inside HiddenSpaceProvider");
  return ctx;
}
