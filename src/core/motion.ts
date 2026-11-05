// Matemática das animações (pura, testável). O componente Remotion só aplica o resultado.
import type { Animation, Entrance, Exit, Phrase } from './types';

export type MotionState = { opacity: number; blur: number; translateY: number; scale: number };
export const IDLE: MotionState = { opacity: 1, blur: 0, translateY: 0, scale: 1 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
/** passa de 1 e volta (efeito "pop") */
const backOut = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** p: 0 = começo da entrada, 1 = fim. */
export function entranceState(type: Entrance, p: number): MotionState {
  const t = clamp01(p);
  const e = easeOut(t);
  switch (type) {
    case 'blurUp':
      return { opacity: e, blur: 14 * (1 - e), translateY: 22 * (1 - e), scale: 1 };
    case 'pop':
      return { opacity: clamp01(t * 3), blur: 0, translateY: 0, scale: 0.6 + 0.4 * backOut(t) };
    case 'fade':
      return { opacity: e, blur: 0, translateY: 0, scale: 1 };
    case 'slideUp':
      return { opacity: e, blur: 0, translateY: 60 * (1 - e), scale: 1 };
    case 'zoomIn':
      return { opacity: e, blur: 6 * (1 - e), translateY: 0, scale: 1.25 - 0.25 * e };
    case 'none':
      return { ...IDLE, opacity: t > 0 ? 1 : 0 };
  }
}

/** p: 0 = começo da saída, 1 = sumiu. */
export function exitState(type: Exit, p: number): MotionState {
  const t = clamp01(p);
  const e = easeIn(t);
  switch (type) {
    case 'blurOut':
      return { opacity: 1 - e, blur: 18 * e, translateY: -10 * e, scale: 1 + 0.08 * e };
    case 'fade':
      return { opacity: 1 - e, blur: 0, translateY: 0, scale: 1 };
    case 'zoomOut':
      return { opacity: 1 - e, blur: 4 * e, translateY: 0, scale: 1 - 0.3 * e };
    case 'none':
      return { ...IDLE, opacity: t >= 1 ? 0 : 1 };
  }
}

export const combine = (a: MotionState, b: MotionState): MotionState => ({
  opacity: a.opacity * b.opacity,
  blur: a.blur + b.blur,
  translateY: a.translateY + b.translateY,
  scale: a.scale * b.scale,
});

/** Momento de entrada e saída de cada palavra, em ms do vídeo. */
export function wordWindows(phrase: Phrase, anim: Animation, visibleEndMs: number): { inMs: number; outMs: number }[] {
  const ws = phrase.words;
  if (!ws.length) return [];
  const start = ws[0].startMs;
  return ws.map((w, i) => {
    if (anim.mode === 'single') {
      const next = ws[i + 1];
      return { inMs: w.startMs, outMs: next ? next.startMs : visibleEndMs };
    }
    if (anim.mode === 'phrase') return { inMs: start + i * anim.staggerMs, outMs: visibleEndMs };
    return { inMs: w.startMs, outMs: visibleEndMs };
  });
}

/** Estado de uma palavra no tempo t (ms). null = invisível. */
export function wordMotion(
  tMs: number,
  win: { inMs: number; outMs: number },
  anim: Animation,
): MotionState | null {
  if (tMs < win.inMs || tMs >= win.outMs) return null;
  const dur = Math.max(1, anim.durationMs);
  const span = win.outMs - win.inMs;
  // saída não pode começar antes da entrada terminar em frases curtas
  const exitDur = Math.min(dur, Math.max(1, span / 2));
  const inP = (tMs - win.inMs) / Math.min(dur, Math.max(1, span / 2));
  const outP = (tMs - (win.outMs - exitDur)) / exitDur;
  const a = entranceState(anim.entrance, inP);
  const b = outP > 0 ? exitState(anim.exit, outP) : IDLE;
  return combine(a, b);
}

/**
 * Karaokê 2.0: fator de escala da palavra falada. Cresce rápido (pop) no início da palavra,
 * fica no máximo enquanto ela é falada e volta a 1 fora dela.
 */
export function highlightPop(tMs: number, word: { startMs: number; endMs: number }, scale = 1, riseMs = 90): number {
  if (!(scale > 0) || scale === 1 || tMs < word.startMs || tMs >= word.endMs) return 1;
  const p = Math.min(1, (tMs - word.startMs) / Math.max(1, riseMs));
  // easeOutBack: passa um pouco do alvo e assenta (sensação de "pop")
  const c = 1.70158;
  const e = 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
  return 1 + (scale - 1) * e;
}

/** Valor do contador (P6): "260,000" anima de 0 a 260000 mantendo o formato. */
export function counterText(text: string, p: number): string {
  const m = text.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!m) return text;
  const [, pre, num, post] = m;
  // com "." e "," juntos, o último é o decimal ("1.500,00", "1,500.50")
  const both = num.includes('.') && num.includes(',');
  const decSep = both ? num[Math.max(num.lastIndexOf('.'), num.lastIndexOf(','))] : '';
  const intStr = decSep ? num.slice(0, num.lastIndexOf(decSep)) : num;
  const frac = decSep ? num.slice(num.lastIndexOf(decSep) + 1) : '';
  const sepThousand = /\d[.,]\d{3}(\D|$)/.test(intStr) ? (intStr.match(/[.,]/)?.[0] ?? '') : '';
  // decimal sozinho ("2,5") não anima: contar 0→25 seria errado
  if (!decSep && /[.,]/.test(num) && !sepThousand) return text;
  if (/[^\d]/.test(frac)) return text;
  const units = Number(intStr.replace(/[.,]/g, '') + frac);
  if (!Number.isFinite(units)) return text;
  const cur = Math.round(units * easeOut(clamp01(p)));
  const scale = 10 ** frac.length;
  const intCur = Math.floor(cur / scale);
  const intBody = sepThousand ? intCur.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sepThousand) : String(intCur);
  const body = decSep ? intBody + decSep + String(cur % scale).padStart(frac.length, '0') : intBody;
  return pre + body + post;
}
