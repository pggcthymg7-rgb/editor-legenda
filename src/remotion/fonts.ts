// Fontes locais (pacotes @fontsource, licença OFL) parecidas com as dos reels de referência.
// Locais = render offline e sem limite de requisições do Google Fonts.
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/inter/wght-italic.css';
import '@fontsource-variable/playfair-display/wght.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import '@fontsource-variable/nunito/wght.css';
import '@fontsource-variable/nunito/wght-italic.css';
import '@fontsource-variable/montserrat/wght.css';
import '@fontsource-variable/montserrat/wght-italic.css';
import '@fontsource-variable/bodoni-moda/wght.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/900.css';
import '@fontsource/poppins/400-italic.css';
import '@fontsource/poppins/700-italic.css';

// Biblioteca ampliada (todas OFL). @font-face só baixa o arquivo quando a fonte é usada.
import '@fontsource-variable/oswald/wght.css';
import '@fontsource-variable/teko/wght.css';
import '@fontsource-variable/big-shoulders-display/wght';
import '@fontsource-variable/unbounded/wght.css';
import '@fontsource-variable/syne/wght.css';
import '@fontsource-variable/space-grotesk/wght.css';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/dancing-script/wght.css';
import '@fontsource-variable/caveat/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource-variable/dm-sans/wght-italic.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource-variable/outfit/wght.css';
import '@fontsource-variable/archivo/wght.css';
import '@fontsource-variable/archivo/wght-italic.css';
import '@fontsource-variable/orbitron/wght.css';
import '@fontsource-variable/cinzel/wght.css';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/anton/400.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource/alfa-slab-one/400.css';
import '@fontsource/bungee/400.css';
import '@fontsource/righteous/400.css';
import '@fontsource/russo-one/400.css';
import '@fontsource/black-ops-one/400.css';
import '@fontsource/rubik-mono-one/400.css';
import '@fontsource/titan-one/400.css';
import '@fontsource/luckiest-guy/400.css';
import '@fontsource/bangers/400.css';
import '@fontsource/shrikhand/400.css';
import '@fontsource/monoton/400.css';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/abril-fatface/400.css';
import '@fontsource/prata/400.css';
import '@fontsource/pacifico/400.css';
import '@fontsource/lobster/400.css';
import '@fontsource/great-vibes/400.css';
import '@fontsource/permanent-marker/400.css';
import '@fontsource/sacramento/400.css';
import '@fontsource/satisfy/400.css';
import '@fontsource/kaushan-script/400.css';
import '@fontsource/yellowtail/400.css';
import '@fontsource/allura/400.css';
import '@fontsource/parisienne/400.css';
import '@fontsource/rock-salt/400.css';
import '@fontsource/bowlby-one-sc/400.css';
import '@fontsource/dela-gothic-one/400.css';
import '@fontsource/league-gothic/400.css';
import '@fontsource/playfair-display-sc/400.css';
import '@fontsource/playfair-display-sc/400-italic.css';
import '@fontsource/playfair-display-sc/700.css';
import '@fontsource/playfair-display-sc/700-italic.css';
import '@fontsource/playfair-display-sc/900.css';
import '@fontsource/playfair-display-sc/900-italic.css';
import { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { FONT_CSS, fontCss } from '../core/fonts';
import type { Project, TextStyle } from '../core/types';
import { findPreset, resolveWordStyle } from '../core/presets';

export { FONT_CSS };

export const fontFamilyCss = (key: TextStyle['fontFamily']) => fontCss(key);

/** Lista "peso estilo família" de tudo que o projeto usa. */
export function usedFontSpecs(project: Project): string[] {
  const set = new Set<string>();
  for (const p of project.phrases) {
    const preset = findPreset(p.presetId, project.customPresets);
    for (const w of p.words) {
      const s = resolveWordStyle(preset, w.role, p.roleStyles, w.style);
      set.add(`${s.italic ? 'italic ' : ''}${s.fontWeight} 40px ${fontCss(s.fontFamily)}`);
    }
  }
  return [...set];
}

/** Segura o render até as fontes usadas carregarem (evita quadro com fonte errada). */
export function useFontsReady(project: Project): boolean {
  // recalcula só quando frases/presets mudam (não a cada quadro)
  const specs = useMemo(() => usedFontSpecs(project).join('|'), [project.phrases, project.customPresets]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = delayRender('Carregando fontes', { timeoutInMilliseconds: 20000 });
    let alive = true;
    Promise.all(specs.split('|').filter(Boolean).map((s) => document.fonts.load(s)))
      .catch(() => undefined)
      .finally(() => {
        clearMeasureCache(); // larguras medidas com a fonte reserva ficam inválidas
        if (alive) setReady(true);
        continueRender(handle);
      });
    return () => {
      alive = false;
      continueRender(handle);
    };
  }, [specs]);
  return ready;
}

let measureCtx: CanvasRenderingContext2D | null = null;
const MEASURE_MAX = 4000;
const measureCache = new Map<string, number>();
export const clearMeasureCache = () => measureCache.clear();
if (typeof document !== 'undefined' && document.fonts?.addEventListener) {
  document.fonts.addEventListener('loadingdone', clearMeasureCache);
}

/** Largura do texto em px (canvas), com as fontes já carregadas. Cache por fonte+tamanho+texto. */
export function measureText(text: string, s: TextStyle, sizePx: number): number {
  if (typeof document === 'undefined') return text.length * sizePx * 0.6;
  const font = `${s.italic ? 'italic ' : ''}${s.fontWeight} ${sizePx}px ${fontCss(s.fontFamily)}`;
  const key = `${font}|${s.letterSpacing}|${text}`;
  const hit = measureCache.get(key);
  if (hit !== undefined) return hit;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * sizePx * 0.6;
  measureCtx.font = font;
  const w = measureCtx.measureText(text).width * (1 + s.letterSpacing);
  if (measureCache.size >= MEASURE_MAX) measureCache.delete(measureCache.keys().next().value!);
  measureCache.set(key, w);
  return w;
}

/** Diminui fontSize (px @1080) até o texto caber em maxWidth (px @1080). */
export function fitStyle(s: TextStyle, text: string, maxWidth: number): TextStyle {
  const w = measureText(text, s, s.fontSize);
  return w > maxWidth ? { ...s, fontSize: (s.fontSize * maxWidth) / w } : s;
}
