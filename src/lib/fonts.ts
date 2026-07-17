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
];

export const DEFAULT_FONT_ID = "inter";

export const FONT_CATEGORIES: FontCategory[] = [
  "Modern", "Minimal", "Elegant", "Rounded", "Professional", "Luxury", "Gaming", "Monospace", "Classic", "Serif",
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
