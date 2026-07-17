import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ThemeId =
  | "midnight"
  | "amoled"
  | "cyber"
  | "tokyo"
  | "dream"
  | "frost"
  | "crimson"
  | "oceanic"
  | "aurora";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  bg: string;
  accent: string;
}

export const THEMES: ThemeMeta[] = [
  { id: "midnight", label: "Midnight Neon", description: "Default cinematic violet", bg: "oklch(0.08 0.02 270)", accent: "oklch(0.72 0.25 285)" },
  { id: "amoled", label: "AMOLED Black", description: "Pure black, OLED friendly", bg: "oklch(0 0 0)", accent: "oklch(0.85 0.18 180)" },
  { id: "cyber", label: "Cyber Blue", description: "Electric blueprint", bg: "oklch(0.09 0.04 240)", accent: "oklch(0.78 0.2 200)" },
  { id: "tokyo", label: "Rainy Tokyo", description: "Indigo + neon pink", bg: "oklch(0.1 0.04 290)", accent: "oklch(0.7 0.27 340)" },
  { id: "dream", label: "Dream Purple", description: "Soft dreamy violet", bg: "oklch(0.1 0.05 310)", accent: "oklch(0.78 0.18 340)" },
  { id: "frost", label: "Glass Frost", description: "Light glassmorphism", bg: "oklch(0.96 0.01 230)", accent: "oklch(0.55 0.18 240)" },
  { id: "crimson", label: "Crimson Pulse", description: "Bold red energy", bg: "oklch(0.09 0.03 20)", accent: "oklch(0.65 0.27 20)" },
  { id: "oceanic", label: "Oceanic", description: "Deep sea cyan", bg: "oklch(0.1 0.04 220)", accent: "oklch(0.78 0.16 180)" },
  { id: "aurora", label: "Aurora Glow", description: "Green + violet shimmer", bg: "oklch(0.1 0.03 160)", accent: "oklch(0.72 0.22 160)" },
];

const STORAGE_KEY = "aura-theme";

function isThemeId(v: string | null | undefined): v is ThemeId {
  return !!v && THEMES.some(t => t.id === v);
}

function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
}

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "midnight", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "midnight";
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeId(stored) ? stored : "midnight";
  });

  // Apply on mount + change
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Hydrate from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = (data as { theme?: string } | null)?.theme;
      if (isThemeId(remote) && remote !== theme) {
        setThemeState(remote);
        try { localStorage.setItem(STORAGE_KEY, remote); } catch {}
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
    if (user) {
      supabase
        .from("user_settings")
        .upsert({ user_id: user.id, theme: id }, { onConflict: "user_id" })
        .then(({ error }) => { if (error) console.error("[Aurix] save theme failed", error); });
    }
  }, [user]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
