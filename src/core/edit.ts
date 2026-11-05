// Operações de edição da timeline (puras e testadas).
import { newId, phraseEnd, phraseStart, retextPhrase, splitPhrase } from './grouping';
import type { Phrase, Project, Word } from './types';

export const MIN_WORD_MS = 40;

const sortPhrases = (ps: Phrase[]) => [...ps].sort((a, b) => phraseStart(a) - phraseStart(b));

/** Estica/encolhe a frase para [start, end], mantendo a proporção do tempo de cada palavra. */
export function retimePhrase(p: Phrase, start: number, end: number): Phrase {
  const s0 = phraseStart(p);
  const e0 = phraseEnd(p);
  start = Math.max(0, Math.round(start));
  end = Math.max(start + MIN_WORD_MS * Math.max(1, p.words.length), Math.round(end));
  const span = Math.max(1, e0 - s0);
  const map = (t: number) => Math.round(start + ((t - s0) / span) * (end - start));
  return { ...p, words: p.words.map((w) => ({ ...w, startMs: map(w.startMs), endMs: Math.max(map(w.startMs) + MIN_WORD_MS, map(w.endMs)) })) };
}

/** Move a frase inteira para começar em `start` (não deixa tempo negativo). */
export function movePhraseTo(p: Phrase, start: number): Phrase {
  const delta = Math.max(0, Math.round(start)) - phraseStart(p);
  return { ...p, words: p.words.map((w) => ({ ...w, startMs: w.startMs + delta, endMs: w.endMs + delta })) };
}

/** Ajusta início/fim de uma palavra sem invadir as vizinhas da mesma frase. */
export function setWordTime(p: Phrase, wordId: string, startMs: number, endMs: number): Phrase {
  const i = p.words.findIndex((w) => w.id === wordId);
  if (i < 0) return p;
  const prev = p.words[i - 1];
  const next = p.words[i + 1];
  const lo = prev ? prev.startMs + MIN_WORD_MS : 0;
  const hi = next ? next.endMs - MIN_WORD_MS : Infinity;
  const s = Math.round(Math.min(Math.max(startMs, lo), hi - MIN_WORD_MS));
  const e = Math.round(Math.max(Math.min(endMs, hi), s + MIN_WORD_MS));
  const words = p.words.map((w, j): Word => {
    if (j === i) return { ...w, startMs: s, endMs: e };
    if (j === i - 1 && w.endMs > s) return { ...w, endMs: Math.max(w.startMs + MIN_WORD_MS, s) };
    if (j === i + 1 && w.startMs < e) return { ...w, startMs: Math.min(w.endMs - MIN_WORD_MS, e) };
    return w;
  });
  return { ...p, words };
}

/** Divide a frase no tempo `ms` (na fronteira de palavra mais próxima). */
export function splitPhraseAt(phrases: Phrase[], phraseId: string, ms: number): Phrase[] {
  const p = phrases.find((x) => x.id === phraseId);
  if (!p || p.words.length < 2) return phrases;
  let at = p.words.findIndex((w) => (w.startMs + w.endMs) / 2 >= ms);
  if (at <= 0) at = 1;
  if (at >= p.words.length) at = p.words.length - 1;
  return splitPhrase(phrases, phraseId, at);
}

/** Duplica a frase logo depois dela (ou no tempo dado). */
export function duplicatePhrase(phrases: Phrase[], phraseId: string, atMs?: number): { phrases: Phrase[]; id: string } {
  const p = phrases.find((x) => x.id === phraseId);
  if (!p) return { phrases, id: phraseId };
  const copy: Phrase = structuredClone(p);
  copy.id = newId('p');
  copy.words = copy.words.map((w) => ({ ...w, id: newId('w') }));
  const moved = movePhraseTo(copy, atMs ?? phraseEnd(p));
  return { phrases: sortPhrases([...phrases, moved]), id: moved.id };
}

export type FindOptions = { caseSensitive?: boolean; wholeWord?: boolean };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function findRegex(find: string, o: FindOptions = {}): RegExp | null {
  if (!find) return null;
  const body = escapeRe(find);
  return new RegExp(o.wholeWord ? `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])` : body, o.caseSensitive ? 'gu' : 'giu');
}

/** Conta ocorrências no projeto. */
export function countMatches(project: Project, find: string, o: FindOptions = {}): number {
  const re = findRegex(find, o);
  if (!re) return 0;
  return project.phrases.reduce((n, p) => n + (p.words.map((w) => w.text).join(' ').match(re)?.length ?? 0), 0);
}

/** Buscar e substituir em todas as frases. Mantém tempos e estilos quando o nº de palavras não muda. */
export function replaceAll(project: Project, find: string, replace: string, o: FindOptions = {}): { project: Project; count: number } {
  const re = findRegex(find, o);
  if (!re) return { project, count: 0 };
  let count = 0;
  const phrases = project.phrases.map((p) => {
    const text = p.words.map((w) => w.text).join(' ');
    const n = text.match(re)?.length ?? 0;
    if (!n) return p;
    count += n;
    return retextPhrase(p, text.replace(re, replace));
  });
  return { project: { ...project, phrases: phrases.filter((p) => p.words.length) }, count };
}

/** Pontos de encaixe (snap) da timeline: inícios/fins de frases. */
export function snapPoints(phrases: Phrase[], exceptId?: string): number[] {
  const pts: number[] = [0];
  for (const p of phrases) if (p.id !== exceptId && p.words.length) pts.push(phraseStart(p), phraseEnd(p));
  return pts;
}

/** Encaixa `ms` no ponto mais próximo dentro da tolerância. */
export function snap(ms: number, points: number[], tolMs: number): number {
  let best = ms;
  let d = tolMs;
  for (const p of points) {
    const dd = Math.abs(p - ms);
    if (dd <= d) {
      d = dd;
      best = p;
    }
  }
  return best;
}

export { sortPhrases };
