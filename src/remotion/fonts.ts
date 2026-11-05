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
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { FONT_CSS } from '../core/fonts';
import type { Project, TextStyle } from '../core/types';
import { findPreset, resolveWordStyle } from '../core/presets';

export { FONT_CSS };

export const fontFamilyCss = (key: TextStyle['fontFamily']) => FONT_CSS[key];

/** Lista "peso estilo família" de tudo que o projeto usa. */
export function usedFontSpecs(project: Project): string[] {
  const set = new Set<string>();
  for (const p of project.phrases) {
    const preset = findPreset(p.presetId, project.customPresets);
    for (const w of p.words) {
      const s = resolveWordStyle(preset, w.role, p.roleStyles, w.style);
      set.add(`${s.italic ? 'italic ' : ''}${s.fontWeight} 40px ${FONT_CSS[s.fontFamily]}`);
    }
  }
  return [...set];
}

/** Segura o render até as fontes usadas carregarem (evita quadro com fonte errada). */
export function useFontsReady(project: Project): boolean {
  const specs = usedFontSpecs(project).join('|');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handle = delayRender('Carregando fontes', { timeoutInMilliseconds: 20000 });
    let alive = true;
    Promise.all(specs.split('|').filter(Boolean).map((s) => document.fonts.load(s)))
      .catch(() => undefined)
      .finally(() => {
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

/** Largura do texto em px (canvas), com as fontes já carregadas. */
export function measureText(text: string, s: TextStyle, sizePx: number): number {
  if (typeof document === 'undefined') return text.length * sizePx * 0.6;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * sizePx * 0.6;
  measureCtx.font = `${s.italic ? 'italic ' : ''}${s.fontWeight} ${sizePx}px ${FONT_CSS[s.fontFamily]}`;
  return measureCtx.measureText(text).width * (1 + s.letterSpacing);
}

/** Diminui fontSize (px @1080) até o texto caber em maxWidth (px @1080). */
export function fitStyle(s: TextStyle, text: string, maxWidth: number): TextStyle {
  const w = measureText(text, s, s.fontSize);
  return w > maxWidth ? { ...s, fontSize: (s.fontSize * maxWidth) / w } : s;
}
