// Divide as palavras de uma frase em linhas (lockup), igual nos dois lados:
// render (Remotion) e export ASS.
import type { Layout, Word } from './types';

export function computeLines(words: Word[], layout: Layout): Word[][] {
  if (layout === 'inline' || layout === 'arc') return words.length ? [words] : [];
  const lines: Word[][] = [];
  let cur: Word[] = [];
  let curSmall: boolean | null = null;
  let bigCount = 0;
  for (const w of words) {
    const small = w.role === 'small';
    const breakLine = cur.length > 0 && (small !== curSmall || (!small && bigCount >= 2));
    if (breakLine) {
      lines.push(cur);
      cur = [];
      bigCount = 0;
    }
    cur.push(w);
    curSmall = small;
    if (!small) bigCount++;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/** Arco (P4): palavras lado a lado; centro sobe, pontas descem e giram para fora. Valores em px @1080. */
export function arcPlacement(index: number, total: number): { x: number; y: number; rotate: number } {
  if (total <= 1) return { x: 0, y: 0, rotate: -8 };
  const t = index / (total - 1); // 0..1
  const c = 2 * t - 1; // -1..1
  return { x: 0, y: c * c * 70 - 35, rotate: -18 + 50 * t };
}
