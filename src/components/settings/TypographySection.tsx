import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search, Star, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AURIX_DEFAULT_ID, FONTS, FONT_CATEGORIES, ensureFontLoaded, getFontById, isDefaultFont, type FontCategory, type FontDef } from "@/lib/fonts";
import { useFont } from "@/hooks/useFont";


/**
 * Typography picker — data-driven grid of font previews.
 * Selecting a font applies it live via the `--app-font` CSS variable
 * managed by `FontProvider`; no save button, no reload.
 */
export function TypographySection() {
  const { fontId, setFont, favorites, toggleFavorite, recent } = useFont();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = FONTS.slice();
    if (category !== "All") list = list.filter(f => f.categories.includes(category));
    if (q) list = list.filter(f => f.name.toLowerCase().includes(q));
    // Favorites first, then rest, preserving list order
    const favSet = new Set(favorites);
    list.sort((a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id)));
    return list;
  }, [query, category, favorites]);

  const recentFonts = useMemo(
    () => recent.map(id => FONTS.find(f => f.id === id)).filter(Boolean) as FontDef[],
    [recent],
  );

  // Preload visible fonts as they appear so previews render in the real face.
  useEffect(() => { filtered.slice(0, 12).forEach(ensureFontLoaded); }, [filtered]);
  useEffect(() => { recentFonts.forEach(ensureFontLoaded); }, [recentFonts]);

  const isDefault = isDefaultFont(fontId);
  const active = isDefault ? null : getFontById(fontId);

  const handleReset = () => {
    setFont(AURIX_DEFAULT_ID);
    toast.success("Typography restored to Aurix Default.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Typography
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Change the font used across the entire app. Applies instantly, no reload.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={isDefault}
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>


      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search fonts"
          className="w-full pl-9 pr-3 h-10 rounded-xl bg-muted/30 border border-border/60 text-sm outline-none focus:border-primary/60 focus:bg-muted/50 transition"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {(["All", ...FONT_CATEGORIES] as const).map(c => {
          const on = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                on ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_var(--neon-glow)]"
                   : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >{c}</button>
          );
        })}
      </div>

      {/* Recently used */}
      {recentFonts.length > 0 && category === "All" && !query && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Recently used</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {recentFonts.map(f => (
              <button
                key={f.id}
                onClick={() => setFont(f.id)}
                style={{ fontFamily: f.fontFamily }}
                className={`px-3 h-9 rounded-lg text-sm border whitespace-nowrap transition ${
                  fontId === f.id ? "border-primary text-primary" : "border-border/60 text-foreground"
                }`}
              >{f.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Font list */}
      <div className="grid grid-cols-1 gap-2.5">
        <AurixDefaultCard active={isDefault} onSelect={() => setFont(AURIX_DEFAULT_ID)} />

        <AnimatePresence initial={false}>
          {filtered.map(f => (
            <FontCard
              key={f.id}
              font={f}
              active={fontId === f.id}
              favorite={favorites.includes(f.id)}
              onSelect={() => setFont(f.id)}
              onToggleFav={() => toggleFavorite(f.id)}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No fonts match "{query}".</p>
        )}
      </div>

      {/* Live conversation preview */}
      <div className="pt-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Live preview</p>
        <motion.div
          layout
          style={active ? { fontFamily: active.fontFamily } : undefined}
          className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2"
        >
          <div className="flex justify-start">
            <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm leading-relaxed">
              Hey! How's the new font looking?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm leading-relaxed">
              Honestly? Chef's kiss 👌 way cleaner than before.
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm leading-relaxed">
              The quick brown fox jumps over the lazy dog — 1234567890
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FontCard({
  font, active, favorite, onSelect, onToggleFav,
}: {
  font: FontDef;
  active: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFav: () => void;
}) {
  useEffect(() => { ensureFontLoaded(font); }, [font]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="relative"
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onSelect}
        style={{ fontFamily: font.fontFamily }}
        className={`w-full text-left rounded-2xl border p-3.5 pr-12 relative transition-all ${
          active
            ? "border-primary bg-primary/5 shadow-[0_0_22px_var(--neon-glow)]"
            : "border-border/60 hover:border-muted-foreground/60 bg-transparent"
        }`}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-3xl leading-none font-semibold">Aa</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{font.name}</p>
              {font.isPremium && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  Local
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {font.categories.join(" · ")}
            </p>
          </div>
        </div>
        <p className="text-sm mt-2 text-foreground/85 leading-relaxed">
          The quick brown fox jumps over the lazy dog.
        </p>

        <AnimatePresence>
          {active && (
            <motion.span
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="absolute top-3 right-3 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_12px_var(--neon-glow)]"
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Favorite star (absolute so it doesn't nest inside the select button) */}
      <button
        onClick={onToggleFav}
        aria-label={favorite ? "Unfavorite font" : "Favorite font"}
        className={`absolute top-3 right-12 h-7 w-7 rounded-full flex items-center justify-center transition ${
          favorite ? "text-yellow-400" : "text-muted-foreground/60 hover:text-foreground"
        }`}
        style={{ transform: "translateY(0)" }}
      >
        <Star className="h-4 w-4" fill={favorite ? "currentColor" : "none"} />
      </button>
    </motion.div>
  );
}
