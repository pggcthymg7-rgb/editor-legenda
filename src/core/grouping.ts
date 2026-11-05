// Transforma palavras transcritas em frases com papéis e modelo sugerido.
import { DEFAULT_PRESET_ID, findPreset } from './presets';
import type { Phrase, Preset, Project, Role, TranscribedWord, VideoMeta, Word } from './types';

let counter = 0;
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Palavras de ligação em PT-BR: ficam pequenas no bloco.
export const STOPWORDS_PT = new Set(
  (
    'a o as os um uma uns umas de do da dos das no na nos nas em num numa ao aos à às pelo pela pelos pelas ' +
    'por para pra pro com sem sob sobre entre até desde e ou mas nem que se como quando onde porque pois ' +
    'eu tu ele ela nós vós eles elas você vocês me te lhe nos vos se meu minha seu sua teu tua nosso nossa ' +
    'isso isto aquilo esse essa este esta aquele aquela é são foi era ser ter tem tá tô vai vou já não sim ' +
    'mais muito bem lá aqui aí então só também'
  ).split(/\s+/),
);

const NUMBER_RE = /^[R$€£]*\d[\d.,]*(%|k|mil|mi)?[.,!?]?$/i;
const END_PUNCT_RE = /[.!?…]$/;

export const cleanWord = (t: string) => t.replace(/^\s+|\s+$/g, '');
const bare = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}%]/gu, '');

export const isNumberWord = (t: string) => NUMBER_RE.test(cleanWord(t));

/** Define small/normal/key para as palavras de uma frase. */
export function assignRoles(texts: string[]): Role[] {
  const roles: Role[] = texts.map((t) => (STOPWORDS_PT.has(bare(t)) ? 'small' : 'normal'));
  const numIdx = texts.findIndex(isNumberWord);
  let keyIdx = numIdx;
  if (keyIdx < 0) {
    let best = -1;
    texts.forEach((t, i) => {
      if (roles[i] === 'small') return;
      const len = bare(t).length;
      // empate: a última vence (ênfase cai no fim da frase)
      if (len >= 3 && (best < 0 || len >= bare(texts[best]).length)) best = i;
    });
    keyIdx = best;
  }
  if (keyIdx >= 0) roles[keyIdx] = 'key';
  return roles;
}

export type GroupOptions = {
  /** pausa que quebra frase */
  gapMs: number;
  maxWords: number;
};

/** Agrupa palavras em frases por pausa, pontuação e limite de palavras. */
export function groupWords(words: TranscribedWord[], opts: GroupOptions): TranscribedWord[][] {
  const groups: TranscribedWord[][] = [];
  let cur: TranscribedWord[] = [];
  for (const w of words) {
    const text = cleanWord(w.text);
    if (!text) continue;
    const prev = cur[cur.length - 1];
    const gap = prev ? w.startMs - prev.endMs : 0;
    if (cur.length && (gap > opts.gapMs || cur.length >= opts.maxWords)) {
      groups.push(cur);
      cur = [];
    }
    cur.push({ ...w, text });
    if (END_PUNCT_RE.test(text) || /,$/.test(text)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

/**
 * Modelo automático no estilo de referência:
 * hook (até 6 s) alterna serif/lilás/bold; frases com número = neon; resto = palavra-única.
 */
export function suggestPreset(group: TranscribedWord[], index: number): string {
  if (group.some((w) => isNumberWord(w.text))) return 'p6-neon';
  if (group[0].startMs < 6000) return ['p2-serif-lilas', 'p1-editorial', 'p4-bold-arco'][index % 3];
  return DEFAULT_PRESET_ID;
}

export function buildPhrase(group: TranscribedWord[], presetId: string, custom: Preset[] = []): Phrase {
  const preset = findPreset(presetId, custom);
  const roles = assignRoles(group.map((w) => w.text));
  const words: Word[] = group.map((w, i) => ({
    id: newId('w'),
    text: w.text,
    startMs: Math.round(w.startMs),
    endMs: Math.round(Math.max(w.endMs, w.startMs + 40)),
    role: roles[i],
  }));
  return {
    id: newId('p'),
    words,
    presetId: preset.id,
    x: preset.position.x,
    y: preset.position.y,
    scale: 1,
    rotation: 0,
    rotateX: 0,
    rotateY: 0,
  };
}

export function buildPhrases(words: TranscribedWord[], auto = true, custom: Preset[] = []): Phrase[] {
  // agrupa com limite largo; frases do modelo palavra-única podem ser longas
  const groups = groupWords(words, { gapMs: 400, maxWords: 4 });
  let hookIdx = 0;
  return groups.map((g) => {
    const id = auto ? suggestPreset(g, hookIdx) : DEFAULT_PRESET_ID;
    if (g[0].startMs < 6000) hookIdx++;
    return buildPhrase(g, id, custom);
  });
}

export function createProject(video: VideoMeta, words: TranscribedWord[], name = 'Projeto'): Project {
  return {
    version: 1,
    id: newId('proj'),
    name,
    video,
    phrases: buildPhrases(words),
    customPresets: [],
  };
}

export const phraseStart = (p: Phrase) => (p.words.length ? p.words[0].startMs : 0);
export const phraseEnd = (p: Phrase) => (p.words.length ? p.words[p.words.length - 1].endMs : 0);
export const phraseText = (p: Phrase) => p.words.map((w) => w.text).join(' ');

/** Fim visível da frase: segura até a próxima começar, limitado por holdMs. */
export function phraseVisibleEnd(phrases: Phrase[], i: number, holdMs: number): number {
  const end = phraseEnd(phrases[i]);
  const next = phrases[i + 1];
  const limit = next ? phraseStart(next) : Infinity;
  return Math.max(end, Math.min(end + holdMs, limit));
}

/** Reescreve o texto de uma frase mantendo tempos (redistribui se o número de palavras mudar). */
export function retextPhrase(p: Phrase, text: string): Phrase {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { ...p, words: [] };
  const start = phraseStart(p);
  const end = phraseEnd(p);
  const roles = assignRoles(tokens);
  if (tokens.length === p.words.length) {
    return { ...p, words: p.words.map((w, i) => ({ ...w, text: tokens[i] })) };
  }
  const step = (end - start) / tokens.length;
  return {
    ...p,
    // mantém ajustes individuais (estilo, posição, escala) da palavra na mesma posição
    words: tokens.map((t, i) => ({
      ...p.words[i],
      id: p.words[i]?.id ?? newId('w'),
      text: t,
      startMs: Math.round(start + step * i),
      endMs: Math.round(start + step * (i + 1)),
      role: roles[i],
    })),
  };
}

/** Divide a frase antes da palavra `at`. */
export function splitPhrase(phrases: Phrase[], phraseId: string, at: number): Phrase[] {
  const i = phrases.findIndex((p) => p.id === phraseId);
  if (i < 0) return phrases;
  const p = phrases[i];
  if (at <= 0 || at >= p.words.length) return phrases;
  const a: Phrase = { ...p, words: p.words.slice(0, at) };
  const b: Phrase = { ...p, id: newId('p'), words: p.words.slice(at) };
  return [...phrases.slice(0, i), a, b, ...phrases.slice(i + 1)];
}

/** Junta a frase com a seguinte (fica o estilo da primeira). */
export function mergeWithNext(phrases: Phrase[], phraseId: string): Phrase[] {
  const i = phrases.findIndex((p) => p.id === phraseId);
  if (i < 0 || i >= phrases.length - 1) return phrases;
  const merged: Phrase = { ...phrases[i], words: [...phrases[i].words, ...phrases[i + 1].words] };
  return [...phrases.slice(0, i), merged, ...phrases.slice(i + 2)];
}

/** Ajusta tempo da frase inteira (desloca todas as palavras). */
export function shiftPhrase(p: Phrase, deltaMs: number): Phrase {
  return {
    ...p,
    words: p.words.map((w) => ({
      ...w,
      startMs: Math.max(0, w.startMs + deltaMs),
      endMs: Math.max(40, w.endMs + deltaMs),
    })),
  };
}
