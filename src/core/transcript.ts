// Normaliza saídas dos motores de transcrição para TranscribedWord[].
import type { TranscribedWord } from './types';

/** Caption do Remotion (whisper-webgpu): texto com espaço inicial, tempos em ms. */
export type RemotionCaption = { text: string; startMs: number; endMs: number };

export function fromRemotionCaptions(captions: RemotionCaption[]): TranscribedWord[] {
  const out: TranscribedWord[] = [];
  for (const c of captions) {
    const text = c.text.trim();
    if (!text) continue;
    // sem espaço inicial = pedaço da palavra anterior (ex.: "estou" + "," )
    if (out.length && !/^\s/.test(c.text)) {
      const prev = out[out.length - 1];
      prev.text += text;
      prev.endMs = Math.max(prev.endMs, c.endMs);
      continue;
    }
    out.push({ text, startMs: c.startMs, endMs: Math.max(c.endMs, c.startMs + 40) });
  }
  return out;
}

/** OpenAI verbose_json com timestamp_granularities=word: tempos em segundos. */
export type OpenAiVerbose = {
  text?: string;
  words?: { word: string; start: number; end: number }[];
};

export function fromOpenAi(res: OpenAiVerbose): TranscribedWord[] {
  const words = (res.words ?? [])
    .filter((w) => w.word.trim())
    .map((w) => ({
      text: w.word.trim(),
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(Math.max(w.end, w.start + 0.04) * 1000),
    }));
  return attachPunctuation(words, res.text ?? '');
}

/**
 * O endpoint de palavras da OpenAI tira a pontuação. Recoloca usando o texto completo,
 * porque a pontuação quebra frases no agrupamento.
 */
export function attachPunctuation(words: TranscribedWord[], fullText: string): TranscribedWord[] {
  if (!fullText) return words;
  const tokens = fullText.split(/\s+/).filter(Boolean);
  const strip = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  let j = 0;
  return words.map((w) => {
    const target = strip(w.text);
    for (let k = j; k < Math.min(tokens.length, j + 4); k++) {
      if (strip(tokens[k]) === target) {
        j = k + 1;
        return { ...w, text: tokens[k] };
      }
    }
    return w;
  });
}
