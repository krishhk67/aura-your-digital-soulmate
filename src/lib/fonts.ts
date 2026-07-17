// Aurix font catalog — data-driven so new packs plug in without touching UI.
// `googleFamily` is the exact family name on Google Fonts; when null the font
// is not fetched (system fallback used).

export type FontCategory =
  | "Modern"
  | "Minimal"
  | "Elegant"
  | "Rounded"
  | "Professional"
  | "Luxury"
  | "Gaming"
  | "Display"
  | "Cursive"
  | "Monospace"
  | "Classic"
  | "Serif";


export interface FontDef {
  id: string;
  name: string;
  categories: FontCategory[];
  /** value used for CSS font-family (with fallback stack) */
  fontFamily: string;
  /** Google Fonts family name, or null if not available on Google */
  googleFamily: string | null;
  weights?: string; // e.g. "400;500;600;700"
  isPremium?: boolean;
}

const SANS_FALLBACK = `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const SERIF_FALLBACK = `Georgia, "Times New Roman", serif`;
const MONO_FALLBACK = `ui-monospace, SFMono-Regular, Menlo, monospace`;

export const FONTS: FontDef[] = [
  { id: "inter", name: "Inter", categories: ["Modern", "Minimal", "Professional"], fontFamily: `"Inter", ${SANS_FALLBACK}`, googleFamily: "Inter", weights: "400;500;600;700" },
  { id: "sf-pro", name: "SF Pro Display", categories: ["Minimal", "Professional"], fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", ${SANS_FALLBACK}`, googleFamily: null, isPremium: true },
  { id: "poppins", name: "Poppins", categories: ["Modern", "Rounded"], fontFamily: `"Poppins", ${SANS_FALLBACK}`, googleFamily: "Poppins", weights: "400;500;600;700" },
  { id: "manrope", name: "Manrope", categories: ["Modern", "Minimal"], fontFamily: `"Manrope", ${SANS_FALLBACK}`, googleFamily: "Manrope", weights: "400;500;600;700" },
  { id: "jakarta", name: "Plus Jakarta Sans", categories: ["Modern", "Professional"], fontFamily: `"Plus Jakarta Sans", ${SANS_FALLBACK}`, googleFamily: "Plus Jakarta Sans", weights: "400;500;600;700" },
  { id: "general-sans", name: "General Sans", categories: ["Modern", "Minimal"], fontFamily: `"General Sans", ${SANS_FALLBACK}`, googleFamily: null, isPremium: true },
  { id: "satoshi", name: "Satoshi", categories: ["Modern", "Luxury"], fontFamily: `"Satoshi", ${SANS_FALLBACK}`, googleFamily: null, isPremium: true },
  { id: "outfit", name: "Outfit", categories: ["Modern", "Rounded"], fontFamily: `"Outfit", ${SANS_FALLBACK}`, googleFamily: "Outfit", weights: "400;500;600;700" },
  { id: "urbanist", name: "Urbanist", categories: ["Modern", "Minimal"], fontFamily: `"Urbanist", ${SANS_FALLBACK}`, googleFamily: "Urbanist", weights: "400;500;600;700" },
  { id: "nunito", name: "Nunito Sans", categories: ["Rounded", "Professional"], fontFamily: `"Nunito Sans", ${SANS_FALLBACK}`, googleFamily: "Nunito Sans", weights: "400;500;600;700" },
  { id: "dm-sans", name: "DM Sans", categories: ["Modern", "Minimal"], fontFamily: `"DM Sans", ${SANS_FALLBACK}`, googleFamily: "DM Sans", weights: "400;500;600;700" },
  { id: "geist", name: "Geist", categories: ["Modern", "Minimal"], fontFamily: `"Geist", ${SANS_FALLBACK}`, googleFamily: "Geist", weights: "400;500;600;700" },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", categories: ["Professional", "Modern"], fontFamily: `"IBM Plex Sans", ${SANS_FALLBACK}`, googleFamily: "IBM Plex Sans", weights: "400;500;600;700" },
  { id: "space-grotesk", name: "Space Grotesk", categories: ["Modern", "Gaming"], fontFamily: `"Space Grotesk", ${SANS_FALLBACK}`, googleFamily: "Space Grotesk", weights: "400;500;600;700" },
  { id: "lexend", name: "Lexend", categories: ["Modern", "Professional"], fontFamily: `"Lexend", ${SANS_FALLBACK}`, googleFamily: "Lexend", weights: "400;500;600;700" },
  { id: "figtree", name: "Figtree", categories: ["Modern", "Rounded"], fontFamily: `"Figtree", ${SANS_FALLBACK}`, googleFamily: "Figtree", weights: "400;500;600;700" },
  { id: "cabinet-grotesk", name: "Cabinet Grotesk", categories: ["Luxury", "Modern"], fontFamily: `"Cabinet Grotesk", ${SANS_FALLBACK}`, googleFamily: null, isPremium: true },
  { id: "onest", name: "Onest", categories: ["Modern", "Minimal"], fontFamily: `"Onest", ${SANS_FALLBACK}`, googleFamily: "Onest", weights: "400;500;600;700" },
  { id: "montserrat", name: "Montserrat", categories: ["Modern", "Professional"], fontFamily: `"Montserrat", ${SANS_FALLBACK}`, googleFamily: "Montserrat", weights: "400;500;600;700" },
  { id: "roboto", name: "Roboto", categories: ["Classic", "Professional"], fontFamily: `"Roboto", ${SANS_FALLBACK}`, googleFamily: "Roboto", weights: "400;500;700" },
  { id: "open-sans", name: "Open Sans", categories: ["Classic", "Professional"], fontFamily: `"Open Sans", ${SANS_FALLBACK}`, googleFamily: "Open Sans", weights: "400;500;600;700" },
  { id: "lato", name: "Lato", categories: ["Classic", "Professional"], fontFamily: `"Lato", ${SANS_FALLBACK}`, googleFamily: "Lato", weights: "400;700" },
  { id: "playfair", name: "Playfair Display", categories: ["Elegant", "Serif", "Luxury"], fontFamily: `"Playfair Display", ${SERIF_FALLBACK}`, googleFamily: "Playfair Display", weights: "400;600;700" },
  { id: "merriweather", name: "Merriweather", categories: ["Serif", "Classic"], fontFamily: `"Merriweather", ${SERIF_FALLBACK}`, googleFamily: "Merriweather", weights: "400;700" },
  { id: "cormorant", name: "Cormorant Garamond", categories: ["Elegant", "Serif", "Luxury"], fontFamily: `"Cormorant Garamond", ${SERIF_FALLBACK}`, googleFamily: "Cormorant Garamond", weights: "400;500;600;700" },
  { id: "jetbrains-mono", name: "JetBrains Mono", categories: ["Monospace", "Gaming"], fontFamily: `"JetBrains Mono", ${MONO_FALLBACK}`, googleFamily: "JetBrains Mono", weights: "400;500;700" },
  { id: "ibm-plex-mono", name: "IBM Plex Mono", categories: ["Monospace", "Professional"], fontFamily: `"IBM Plex Mono", ${MONO_FALLBACK}`, googleFamily: "IBM Plex Mono", weights: "400;500;700" },
  { id: "fira-code", name: "Fira Code", categories: ["Monospace", "Gaming"], fontFamily: `"Fira Code", ${MONO_FALLBACK}`, googleFamily: "Fira Code", weights: "400;500;700" },

  // ---- Display / Stylish ----
  { id: "bebas-neue", name: "Bebas Neue", categories: ["Display"], fontFamily: `"Bebas Neue", ${SANS_FALLBACK}`, googleFamily: "Bebas Neue", weights: "400" },
  { id: "anton", name: "Anton", categories: ["Display"], fontFamily: `"Anton", ${SANS_FALLBACK}`, googleFamily: "Anton", weights: "400" },
  { id: "oswald", name: "Oswald", categories: ["Display", "Professional"], fontFamily: `"Oswald", ${SANS_FALLBACK}`, googleFamily: "Oswald", weights: "400;500;600;700" },
  { id: "righteous", name: "Righteous", categories: ["Display"], fontFamily: `"Righteous", ${SANS_FALLBACK}`, googleFamily: "Righteous", weights: "400" },
  { id: "audiowide", name: "Audiowide", categories: ["Display", "Gaming"], fontFamily: `"Audiowide", ${SANS_FALLBACK}`, googleFamily: "Audiowide", weights: "400" },
  { id: "orbitron", name: "Orbitron", categories: ["Display", "Gaming"], fontFamily: `"Orbitron", ${SANS_FALLBACK}`, googleFamily: "Orbitron", weights: "400;500;700" },
  { id: "exo-2", name: "Exo 2", categories: ["Display", "Modern"], fontFamily: `"Exo 2", ${SANS_FALLBACK}`, googleFamily: "Exo 2", weights: "400;500;600;700" },
  { id: "rajdhani", name: "Rajdhani", categories: ["Display", "Gaming"], fontFamily: `"Rajdhani", ${SANS_FALLBACK}`, googleFamily: "Rajdhani", weights: "400;500;600;700" },
  { id: "teko", name: "Teko", categories: ["Display"], fontFamily: `"Teko", ${SANS_FALLBACK}`, googleFamily: "Teko", weights: "400;500;600;700" },
  { id: "bungee", name: "Bungee", categories: ["Display"], fontFamily: `"Bungee", ${SANS_FALLBACK}`, googleFamily: "Bungee", weights: "400" },
  { id: "fredoka", name: "Fredoka", categories: ["Display", "Rounded"], fontFamily: `"Fredoka", ${SANS_FALLBACK}`, googleFamily: "Fredoka", weights: "400;500;600;700" },
  { id: "comfortaa", name: "Comfortaa", categories: ["Display", "Rounded"], fontFamily: `"Comfortaa", ${SANS_FALLBACK}`, googleFamily: "Comfortaa", weights: "400;500;600;700" },
  { id: "baloo-2", name: "Baloo 2", categories: ["Display", "Rounded"], fontFamily: `"Baloo 2", ${SANS_FALLBACK}`, googleFamily: "Baloo 2", weights: "400;500;600;700" },
  { id: "poiret-one", name: "Poiret One", categories: ["Display", "Elegant"], fontFamily: `"Poiret One", ${SANS_FALLBACK}`, googleFamily: "Poiret One", weights: "400" },
  { id: "cinzel", name: "Cinzel", categories: ["Display", "Elegant", "Serif", "Luxury"], fontFamily: `"Cinzel", ${SERIF_FALLBACK}`, googleFamily: "Cinzel", weights: "400;500;600;700" },
  { id: "abril-fatface", name: "Abril Fatface", categories: ["Display", "Serif", "Elegant"], fontFamily: `"Abril Fatface", ${SERIF_FALLBACK}`, googleFamily: "Abril Fatface", weights: "400" },

  // ---- Cursive / Handwritten ----
  { id: "dancing-script", name: "Dancing Script", categories: ["Cursive", "Elegant"], fontFamily: `"Dancing Script", cursive`, googleFamily: "Dancing Script", weights: "400;500;600;700" },
  { id: "pacifico", name: "Pacifico", categories: ["Cursive"], fontFamily: `"Pacifico", cursive`, googleFamily: "Pacifico", weights: "400" },
  { id: "great-vibes", name: "Great Vibes", categories: ["Cursive", "Elegant", "Luxury"], fontFamily: `"Great Vibes", cursive`, googleFamily: "Great Vibes", weights: "400" },
  { id: "satisfy", name: "Satisfy", categories: ["Cursive"], fontFamily: `"Satisfy", cursive`, googleFamily: "Satisfy", weights: "400" },
  { id: "allura", name: "Allura", categories: ["Cursive", "Elegant"], fontFamily: `"Allura", cursive`, googleFamily: "Allura", weights: "400" },
  { id: "kaushan-script", name: "Kaushan Script", categories: ["Cursive"], fontFamily: `"Kaushan Script", cursive`, googleFamily: "Kaushan Script", weights: "400" },
  { id: "yellowtail", name: "Yellowtail", categories: ["Cursive"], fontFamily: `"Yellowtail", cursive`, googleFamily: "Yellowtail", weights: "400" },
  { id: "parisienne", name: "Parisienne", categories: ["Cursive", "Elegant"], fontFamily: `"Parisienne", cursive`, googleFamily: "Parisienne", weights: "400" },
  { id: "alex-brush", name: "Alex Brush", categories: ["Cursive", "Elegant"], fontFamily: `"Alex Brush", cursive`, googleFamily: "Alex Brush", weights: "400" },
  { id: "sacramento", name: "Sacramento", categories: ["Cursive"], fontFamily: `"Sacramento", cursive`, googleFamily: "Sacramento", weights: "400" },
  { id: "cookie", name: "Cookie", categories: ["Cursive"], fontFamily: `"Cookie", cursive`, googleFamily: "Cookie", weights: "400" },
  { id: "marck-script", name: "Marck Script", categories: ["Cursive"], fontFamily: `"Marck Script", cursive`, googleFamily: "Marck Script", weights: "400" },
  { id: "charm", name: "Charm", categories: ["Cursive"], fontFamily: `"Charm", cursive`, googleFamily: "Charm", weights: "400;700" },
  { id: "courgette", name: "Courgette", categories: ["Cursive"], fontFamily: `"Courgette", cursive`, googleFamily: "Courgette", weights: "400" },
  { id: "caveat", name: "Caveat", categories: ["Cursive"], fontFamily: `"Caveat", cursive`, googleFamily: "Caveat", weights: "400;500;600;700" },
  { id: "kalam", name: "Kalam", categories: ["Cursive"], fontFamily: `"Kalam", cursive`, googleFamily: "Kalam", weights: "400;700" },
  { id: "handlee", name: "Handlee", categories: ["Cursive"], fontFamily: `"Handlee", cursive`, googleFamily: "Handlee", weights: "400" },
  { id: "shadows-into-light", name: "Shadows Into Light", categories: ["Cursive"], fontFamily: `"Shadows Into Light", cursive`, googleFamily: "Shadows Into Light", weights: "400" },
  { id: "bad-script", name: "Bad Script", categories: ["Cursive"], fontFamily: `"Bad Script", cursive`, googleFamily: "Bad Script", weights: "400" },
  { id: "nothing-you-could-do", name: "Nothing You Could Do", categories: ["Cursive"], fontFamily: `"Nothing You Could Do", cursive`, googleFamily: "Nothing You Could Do", weights: "400" },
];

/** Sentinel id representing the original Aurix typography (no override). */
export const AURIX_DEFAULT_ID = "aurix-default";
export const DEFAULT_FONT_ID = AURIX_DEFAULT_ID;
export const isDefaultFont = (id: string) => id === AURIX_DEFAULT_ID;

export const FONT_CATEGORIES: FontCategory[] = [
  "Modern", "Minimal", "Elegant", "Rounded", "Professional", "Luxury", "Gaming", "Display", "Cursive", "Monospace", "Classic", "Serif",
];


export function getFontById(id: string): FontDef {
  return FONTS.find(f => f.id === id) ?? FONTS[0];
}

const loaded = new Set<string>();

/** Lazily inject a Google Fonts <link> for the given font. No-op if already loaded or unavailable. */
export function ensureFontLoaded(font: FontDef): void {
  if (typeof document === "undefined") return;
  if (!font.googleFamily) return;
  if (loaded.has(font.id)) return;
  const linkId = `aurix-font-${font.id}`;
  if (document.getElementById(linkId)) { loaded.add(font.id); return; }
  const family = font.googleFamily.replace(/ /g, "+");
  const weights = font.weights ?? "400;500;600;700";
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  loaded.add(font.id);
}
