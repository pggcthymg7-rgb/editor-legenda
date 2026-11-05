import type { FontKey } from './types';

/** font-family CSS de cada fonte (nomes registrados pelos pacotes @fontsource). */
export const FONT_CSS: Record<FontKey, string> = {
  playfair: "'Playfair Display Variable', 'Playfair Display', serif",
  dmserif: "'DM Serif Display', serif",
  bodoni: "'Bodoni Moda Variable', 'Bodoni Moda', serif",
  instrument: "'Instrument Serif', serif",
  inter: "'Inter Variable', 'Inter', sans-serif",
  nunito: "'Nunito Variable', 'Nunito', sans-serif",
  montserrat: "'Montserrat Variable', 'Montserrat', sans-serif",
  poppins: "'Poppins', sans-serif",
};

export const FONT_OPTIONS: { key: FontKey; label: string }[] = [
  { key: 'playfair', label: 'Playfair Display (serif)' },
  { key: 'dmserif', label: 'DM Serif Display (serif)' },
  { key: 'bodoni', label: 'Bodoni Moda (serif)' },
  { key: 'instrument', label: 'Instrument Serif (serif)' },
  { key: 'inter', label: 'Inter (sans)' },
  { key: 'nunito', label: 'Nunito (sans arredondada)' },
  { key: 'montserrat', label: 'Montserrat (sans)' },
  { key: 'poppins', label: 'Poppins (sans)' },
];
