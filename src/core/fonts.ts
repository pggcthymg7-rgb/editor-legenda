// Biblioteca de fontes: todas grátis (SIL Open Font License / Apache), empacotadas localmente via @fontsource.
// Locais = render offline, PWA offline e sem depender do Google Fonts.

export type FontCategory = 'serif' | 'sans' | 'display' | 'script' | 'retro';

export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: 'serif', label: 'Serifadas / editorial' },
  { id: 'sans', label: 'Sem serifa' },
  { id: 'display', label: 'Impacto / condensadas' },
  { id: 'script', label: 'Manuscritas / script' },
  { id: 'retro', label: 'Retrô / tech' },
];

type FontDef = {
  key: string;
  /** nome mostrado e usado no ASS */
  name: string;
  /** font-family registrada pelo pacote */
  family: string;
  category: FontCategory;
  /** faixa de peso disponível (fontes estáticas: um só peso) */
  weights: [number, number];
  italic: boolean;
  fallback: 'serif' | 'sans-serif' | 'cursive' | 'monospace';
};

export const FONTS = [
  // Serifadas
  { key: 'playfair', name: 'Playfair Display', family: 'Playfair Display Variable', category: 'serif', weights: [400, 900], italic: true, fallback: 'serif' },
  { key: 'playfairsc', name: 'Playfair Display SC', family: 'Playfair Display SC', category: 'serif', weights: [400, 900], italic: true, fallback: 'serif' },
  { key: 'dmserif', name: 'DM Serif Display', family: 'DM Serif Display', category: 'serif', weights: [400, 400], italic: true, fallback: 'serif' },
  { key: 'bodoni', name: 'Bodoni Moda', family: 'Bodoni Moda Variable', category: 'serif', weights: [400, 900], italic: true, fallback: 'serif' },
  { key: 'instrument', name: 'Instrument Serif', family: 'Instrument Serif', category: 'serif', weights: [400, 400], italic: true, fallback: 'serif' },
  { key: 'cormorant', name: 'Cormorant Garamond', family: 'Cormorant Garamond Variable', category: 'serif', weights: [300, 700], italic: true, fallback: 'serif' },
  { key: 'fraunces', name: 'Fraunces', family: 'Fraunces Variable', category: 'serif', weights: [100, 900], italic: true, fallback: 'serif' },
  { key: 'abril', name: 'Abril Fatface', family: 'Abril Fatface', category: 'serif', weights: [400, 400], italic: false, fallback: 'serif' },
  { key: 'prata', name: 'Prata', family: 'Prata', category: 'serif', weights: [400, 400], italic: false, fallback: 'serif' },
  { key: 'cinzel', name: 'Cinzel', family: 'Cinzel Variable', category: 'serif', weights: [400, 900], italic: false, fallback: 'serif' },
  { key: 'alfaslab', name: 'Alfa Slab One', family: 'Alfa Slab One', category: 'serif', weights: [400, 400], italic: false, fallback: 'serif' },
  // Sem serifa
  { key: 'inter', name: 'Inter', family: 'Inter Variable', category: 'sans', weights: [100, 900], italic: true, fallback: 'sans-serif' },
  { key: 'montserrat', name: 'Montserrat', family: 'Montserrat Variable', category: 'sans', weights: [100, 900], italic: true, fallback: 'sans-serif' },
  { key: 'poppins', name: 'Poppins', family: 'Poppins', category: 'sans', weights: [300, 900], italic: true, fallback: 'sans-serif' },
  { key: 'nunito', name: 'Nunito', family: 'Nunito Variable', category: 'sans', weights: [200, 1000], italic: true, fallback: 'sans-serif' },
  { key: 'dmsans', name: 'DM Sans', family: 'DM Sans Variable', category: 'sans', weights: [100, 1000], italic: true, fallback: 'sans-serif' },
  { key: 'manrope', name: 'Manrope', family: 'Manrope Variable', category: 'sans', weights: [200, 800], italic: false, fallback: 'sans-serif' },
  { key: 'outfit', name: 'Outfit', family: 'Outfit Variable', category: 'sans', weights: [100, 900], italic: false, fallback: 'sans-serif' },
  { key: 'archivo', name: 'Archivo', family: 'Archivo Variable', category: 'sans', weights: [100, 900], italic: true, fallback: 'sans-serif' },
  { key: 'spacegrotesk', name: 'Space Grotesk', family: 'Space Grotesk Variable', category: 'sans', weights: [300, 700], italic: false, fallback: 'sans-serif' },
  { key: 'bricolage', name: 'Bricolage Grotesque', family: 'Bricolage Grotesque Variable', category: 'sans', weights: [200, 800], italic: false, fallback: 'sans-serif' },
  { key: 'syne', name: 'Syne', family: 'Syne Variable', category: 'sans', weights: [400, 800], italic: false, fallback: 'sans-serif' },
  { key: 'unbounded', name: 'Unbounded', family: 'Unbounded Variable', category: 'sans', weights: [200, 900], italic: false, fallback: 'sans-serif' },
  // Impacto / condensadas
  { key: 'bebas', name: 'Bebas Neue', family: 'Bebas Neue', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'anton', name: 'Anton', family: 'Anton', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'oswald', name: 'Oswald', family: 'Oswald Variable', category: 'display', weights: [200, 700], italic: false, fallback: 'sans-serif' },
  { key: 'leaguegothic', name: 'League Gothic', family: 'League Gothic', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'bigshoulders', name: 'Big Shoulders Display', family: 'Big Shoulders Display Variable', category: 'display', weights: [100, 900], italic: false, fallback: 'sans-serif' },
  { key: 'teko', name: 'Teko', family: 'Teko Variable', category: 'display', weights: [300, 700], italic: false, fallback: 'sans-serif' },
  { key: 'archivoblack', name: 'Archivo Black', family: 'Archivo Black', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'dela', name: 'Dela Gothic One', family: 'Dela Gothic One', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'bowlby', name: 'Bowlby One SC', family: 'Bowlby One SC', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'titan', name: 'Titan One', family: 'Titan One', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'luckiest', name: 'Luckiest Guy', family: 'Luckiest Guy', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'bangers', name: 'Bangers', family: 'Bangers', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'shrikhand', name: 'Shrikhand', family: 'Shrikhand', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'bungee', name: 'Bungee', family: 'Bungee', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'righteous', name: 'Righteous', family: 'Righteous', category: 'display', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  // Manuscritas / script
  { key: 'pacifico', name: 'Pacifico', family: 'Pacifico', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'lobster', name: 'Lobster', family: 'Lobster', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'dancing', name: 'Dancing Script', family: 'Dancing Script Variable', category: 'script', weights: [400, 700], italic: false, fallback: 'cursive' },
  { key: 'greatvibes', name: 'Great Vibes', family: 'Great Vibes', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'caveat', name: 'Caveat', family: 'Caveat Variable', category: 'script', weights: [400, 700], italic: false, fallback: 'cursive' },
  { key: 'marker', name: 'Permanent Marker', family: 'Permanent Marker', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'sacramento', name: 'Sacramento', family: 'Sacramento', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'satisfy', name: 'Satisfy', family: 'Satisfy', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'kaushan', name: 'Kaushan Script', family: 'Kaushan Script', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'yellowtail', name: 'Yellowtail', family: 'Yellowtail', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'allura', name: 'Allura', family: 'Allura', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'parisienne', name: 'Parisienne', family: 'Parisienne', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  { key: 'rocksalt', name: 'Rock Salt', family: 'Rock Salt', category: 'script', weights: [400, 400], italic: false, fallback: 'cursive' },
  // Retrô / tech
  { key: 'monoton', name: 'Monoton', family: 'Monoton', category: 'retro', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'pressstart', name: 'Press Start 2P', family: 'Press Start 2P', category: 'retro', weights: [400, 400], italic: false, fallback: 'monospace' },
  { key: 'orbitron', name: 'Orbitron', family: 'Orbitron Variable', category: 'retro', weights: [400, 900], italic: false, fallback: 'sans-serif' },
  { key: 'russo', name: 'Russo One', family: 'Russo One', category: 'retro', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'blackops', name: 'Black Ops One', family: 'Black Ops One', category: 'retro', weights: [400, 400], italic: false, fallback: 'sans-serif' },
  { key: 'rubikmono', name: 'Rubik Mono One', family: 'Rubik Mono One', category: 'retro', weights: [400, 400], italic: false, fallback: 'monospace' },
] as const satisfies readonly FontDef[];

export type FontKey = (typeof FONTS)[number]['key'];

const BY_KEY = new Map<string, (typeof FONTS)[number]>(FONTS.map((f) => [f.key, f]));
export const FONT_KEYS = new Set<string>(FONTS.map((f) => f.key));
export const isFontKey = (k: unknown): k is FontKey => typeof k === 'string' && FONT_KEYS.has(k);

export const fontDef = (key: string) => BY_KEY.get(key) ?? BY_KEY.get('inter')!;

/** font-family CSS (com fallback). Chave desconhecida cai em Inter. */
export const fontCss = (key: string): string => {
  const f = fontDef(key);
  return `'${f.family}', '${f.name}', ${f.fallback}`;
};

/** compat: mapa chave → CSS */
export const FONT_CSS: Record<FontKey, string> = Object.fromEntries(FONTS.map((f) => [f.key, fontCss(f.key)])) as Record<FontKey, string>;

/** nome da fonte instalada no computador (ASS / Premiere). */
export const fontName = (key: string) => fontDef(key).name;

export const FONT_OPTIONS = FONTS.map((f) => ({ key: f.key as FontKey, label: f.name, category: f.category }));
