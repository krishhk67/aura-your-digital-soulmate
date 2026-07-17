import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_FONT_ID, FONTS, ensureFontLoaded, getFontById } from "@/lib/fonts";

const FONT_KEY = "aurix-font";
const FAV_KEY = "aurix-font-favorites";
const RECENT_KEY = "aurix-font-recent";
const MAX_RECENT = 5;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v.filter(x => typeof x === "string") : []; }
  catch { return []; }
}
function writeList(key: string, v: string[]) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

function applyFont(id: string) {
  if (typeof document === "undefined") return;
  const font = getFontById(id);
  ensureFontLoaded(font);
  document.documentElement.style.setProperty("--app-font", font.fontFamily);
}

interface FontCtx {
  fontId: string;
  setFont: (id: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  recent: string[];
}

const Ctx = createContext<FontCtx>({
  fontId: DEFAULT_FONT_ID,
  setFont: () => {},
  favorites: [],
  toggleFavorite: () => {},
  recent: [],
});

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontId, setFontId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_FONT_ID;
    const stored = localStorage.getItem(FONT_KEY);
    return stored && FONTS.some(f => f.id === stored) ? stored : DEFAULT_FONT_ID;
  });
  const [favorites, setFavorites] = useState<string[]>(() => readList(FAV_KEY));
  const [recent, setRecent] = useState<string[]>(() => readList(RECENT_KEY));

  // Apply on mount + change (also preloads via Google Fonts CSS link)
  useEffect(() => { applyFont(fontId); }, [fontId]);

  // Warm-load favorites so switching feels instant
  useEffect(() => { favorites.forEach(id => ensureFontLoaded(getFontById(id))); }, [favorites]);

  const setFont = useCallback((id: string) => {
    if (!FONTS.some(f => f.id === id)) return;
    setFontId(id);
    try { localStorage.setItem(FONT_KEY, id); } catch {}
    setRecent(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, MAX_RECENT);
      writeList(RECENT_KEY, next);
      return next;
    });
    // Haptic on mobile
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(8); } catch {}
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev];
      writeList(FAV_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ fontId, setFont, favorites, toggleFavorite, recent }), [fontId, setFont, favorites, toggleFavorite, recent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFont() { return useContext(Ctx); }
