// Modelos P1–P8 medidos nos reels de referência (ver docs/ANALISE.md).
// Tamanhos em px para 1080 de largura.
import type { Animation, Preset, Role, TextStyle } from './types';

const base: TextStyle = {
  fontFamily: 'inter',
  fontWeight: 400,
  italic: false,
  fontSize: 60,
  fill: { type: 'solid', color: '#FFFFFF' },
  letterSpacing: 0,
  uppercase: false,
  opacity: 1,
  glow: null,
  shadow: { color: 'rgba(0,0,0,0.35)', blur: 18, x: 0, y: 4 },
  stroke: null,
};

const s = (o: Partial<TextStyle>): TextStyle => ({ ...base, ...o });

const anim = (o: Partial<Animation>): Animation => ({
  entrance: 'blurUp',
  exit: 'blurOut',
  durationMs: 260,
  staggerMs: 80,
  mode: 'word',
  holdMs: 400,
  ...o,
});

export const LILAC: TextStyle['fill'] = { type: 'gradient', colors: ['#D9C9FF', '#A98BFF', '#6B3FD1'], angle: 180 };
export const CHROME: TextStyle['fill'] = {
  type: 'gradient',
  colors: ['#FFFFFF', '#C9CED6', '#8A929E', '#E9ECF1'],
  angle: 180,
};
export const ORANGE: TextStyle['fill'] = { type: 'gradient', colors: ['#FFB347', '#FF7A00'], angle: 180 };
export const NEON_PINK = '#FF3FD8';

export const PRESETS: Preset[] = [
  {
    id: 'p1-editorial',
    name: 'P1 Editorial Serif',
    description: 'Serif alto contraste, palavra-chave enorme em cromo. Hooks.',
    roles: {
      small: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 58 }),
      normal: s({ fontFamily: 'playfair', fontWeight: 500, fontSize: 120 }),
      key: s({ fontFamily: 'playfair', fontWeight: 600, fontSize: 170, fill: CHROME, letterSpacing: -0.02 }),
    },
    animation: anim({ mode: 'word' }),
    layout: 'stack',
    align: 'center',
    position: { x: 0.5, y: 0.3 },
    lineGap: -0.15,
    counter: false,
    maxWords: 4,
  },
  {
    id: 'p2-serif-lilas',
    name: 'P2 Serif + Itálico Lilás',
    description: 'Serif branca com palavra-chave itálica lilás degradê. Hooks e frases de impacto.',
    roles: {
      small: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 56, italic: true }),
      normal: s({ fontFamily: 'playfair', fontWeight: 500, fontSize: 112 }),
      key: s({
        fontFamily: 'playfair',
        fontWeight: 600,
        italic: true,
        fontSize: 140,
        fill: LILAC,
        glow: { color: 'rgba(169,139,255,0.55)', blur: 22 },
      }),
    },
    animation: anim({ mode: 'word', staggerMs: 90 }),
    layout: 'stack',
    align: 'center',
    position: { x: 0.5, y: 0.32 },
    lineGap: -0.12,
    counter: false,
    maxWords: 4,
  },
  {
    id: 'p3-palavra-unica',
    name: 'P3 Sans Fina Palavra-Única',
    description: 'Uma palavra por vez, sans fina branca na altura do peito. Corpo do vídeo.',
    roles: {
      small: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 64 }),
      normal: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 64 }),
      key: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 64 }),
    },
    animation: anim({ mode: 'single', entrance: 'fade', exit: 'fade', durationMs: 120, staggerMs: 0, holdMs: 250 }),
    layout: 'inline',
    align: 'center',
    position: { x: 0.5, y: 0.56 },
    lineGap: 0,
    counter: false,
    maxWords: 6,
  },
  {
    id: 'p4-bold-arco',
    name: 'P4 Sans Bold Arredondada',
    description: 'Sans black arredondada, palavras pulando em arco inclinado.',
    roles: {
      small: s({ fontFamily: 'nunito', fontWeight: 800, fontSize: 80, fill: { type: 'solid', color: '#F1E8FF' } }),
      normal: s({ fontFamily: 'nunito', fontWeight: 900, fontSize: 110, fill: { type: 'solid', color: '#E8D5FF' } }),
      key: s({ fontFamily: 'nunito', fontWeight: 900, fontSize: 130, fill: { type: 'solid', color: '#E8D5FF' } }),
    },
    animation: anim({ entrance: 'pop', exit: 'blurOut', durationMs: 300, staggerMs: 120 }),
    layout: 'arc',
    align: 'center',
    position: { x: 0.5, y: 0.26 },
    lineGap: 0,
    counter: false,
    maxWords: 3,
  },
  {
    id: 'p5-gigante',
    name: 'P5 Palavra Gigante',
    description: 'Uma palavra ocupando a largura toda, sans bold branca.',
    roles: {
      small: s({ fontFamily: 'inter', fontWeight: 800, fontSize: 90 }),
      normal: s({ fontFamily: 'inter', fontWeight: 900, fontSize: 320, letterSpacing: -0.05 }),
      key: s({ fontFamily: 'inter', fontWeight: 900, fontSize: 380, letterSpacing: -0.05 }),
    },
    animation: anim({ mode: 'single', entrance: 'zoomIn', exit: 'none', durationMs: 180, staggerMs: 0, holdMs: 200 }),
    layout: 'inline',
    align: 'center',
    position: { x: 0.5, y: 0.42 },
    lineGap: -0.2,
    counter: false,
    fitWidth: true,
    maxWords: 2,
  },
  {
    id: 'p6-neon',
    name: 'P6 Número Neon',
    description: 'Número magenta neon com brilho forte, conta de 0 até o valor.',
    roles: {
      small: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 56 }),
      normal: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 64 }),
      key: s({
        fontFamily: 'inter',
        fontWeight: 800,
        fontSize: 230,
        fill: { type: 'gradient', colors: ['#FF8BEA', NEON_PINK], angle: 180 },
        glow: { color: NEON_PINK, blur: 40 },
        shadow: null,
      }),
    },
    animation: anim({ entrance: 'zoomIn', exit: 'fade', durationMs: 300 }),
    layout: 'stack',
    align: 'center',
    position: { x: 0.5, y: 0.2 },
    lineGap: -0.05,
    counter: true,
    maxWords: 3,
  },
  {
    id: 'p7-misto',
    name: 'P7 Caixa Alta Mista',
    description: 'Mistura sans caps colorida, itálica e serif, com perspectiva 3D.',
    roles: {
      small: s({ fontFamily: 'inter', fontWeight: 300, italic: true, fontSize: 70 }),
      normal: s({ fontFamily: 'inter', fontWeight: 300, fontSize: 96 }),
      key: s({
        fontFamily: 'montserrat',
        fontWeight: 800,
        uppercase: true,
        fontSize: 120,
        fill: { type: 'gradient', colors: ['#FF9BD5', '#E0469B'], angle: 180 },
      }),
    },
    animation: anim({ entrance: 'slideUp', staggerMs: 100 }),
    layout: 'stack',
    align: 'center',
    position: { x: 0.5, y: 0.25 },
    lineGap: -0.05,
    counter: false,
    maxWords: 4,
  },
  {
    id: 'p8-destaque',
    name: 'P8 Destaque Colorido',
    description: 'Sans bold branca com uma palavra em cor sólida forte.',
    roles: {
      small: s({ fontFamily: 'nunito', fontWeight: 800, fontSize: 64 }),
      normal: s({ fontFamily: 'nunito', fontWeight: 800, fontSize: 80 }),
      key: s({
        fontFamily: 'montserrat',
        fontWeight: 900,
        uppercase: true,
        fontSize: 150,
        fill: { type: 'gradient', colors: ['#5FD3E6', '#1E8FB0'], angle: 180 },
      }),
    },
    animation: anim({ entrance: 'pop', staggerMs: 100 }),
    layout: 'stack',
    align: 'center',
    position: { x: 0.5, y: 0.3 },
    lineGap: -0.05,
    counter: false,
    maxWords: 4,
  },
];

export const DEFAULT_PRESET_ID = 'p3-palavra-unica';

export function findPreset(id: string, custom: Preset[] = []): Preset {
  return custom.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!;
}

/** Estilo final de uma palavra: preset → override da frase → override da palavra. */
export function resolveWordStyle(
  preset: Preset,
  role: Role,
  phraseOverride?: Partial<Record<Role, Partial<TextStyle>>>,
  wordOverride?: Partial<TextStyle>,
): TextStyle {
  return { ...preset.roles[role], ...(phraseOverride?.[role] ?? {}), ...(wordOverride ?? {}) };
}

export function resolveAnimation(preset: Preset, override?: Partial<Animation>): Animation {
  return { ...preset.animation, ...(override ?? {}) };
}
