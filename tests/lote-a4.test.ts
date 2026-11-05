// Lote A4: Karaokê 2.0 (pop), emojis por contexto, dividir na palavra e validação do novo campo.
import { describe, expect, it } from 'vitest';
import { suggestEmojis, suggestForText, withEmoji } from '../src/core/emojis';
import { createProject, splitPhrase } from '../src/core/grouping';
import { highlightPop } from '../src/core/motion';
import { validateProject } from '../src/core/validate';

const video = { src: '/media/a.mp4', width: 1080, height: 1920, durationMs: 5000, fps: 30 };
const words = [
  { text: 'Isso', startMs: 0, endMs: 300 },
  { text: 'vende', startMs: 300, endMs: 700 },
  { text: 'muito', startMs: 700, endMs: 1100 },
];

describe('Karaokê 2.0: highlightPop', () => {
  const w = { startMs: 1000, endMs: 1500 };
  it('fora da palavra ou escala 1 não muda nada', () => {
    expect(highlightPop(999, w, 1.3)).toBe(1);
    expect(highlightPop(1500, w, 1.3)).toBe(1);
    expect(highlightPop(1200, w, 1)).toBe(1);
  });
  it('começa em 1, passa um pouco do alvo (pop) e assenta no alvo', () => {
    expect(highlightPop(1000, w, 1.3)).toBeCloseTo(1, 5);
    const samples = Array.from({ length: 10 }, (_, i) => highlightPop(1000 + i * 10, w, 1.3));
    expect(Math.max(...samples)).toBeGreaterThan(1.3);
    expect(highlightPop(1300, w, 1.3)).toBeCloseTo(1.3, 5);
  });
  it('escala inválida não quebra', () => {
    expect(highlightPop(1200, w, NaN)).toBe(1);
    expect(highlightPop(1200, w, 0)).toBe(1);
  });
});

describe('emojis por contexto', () => {
  it('reconhece palavra com pontuação e acento (PT/EN)', () => {
    expect(suggestEmojis('dinheiro!')[0]).toBe('💰');
    expect(suggestEmojis('Atenção:')[0]).toBe('⚠️');
    expect(suggestEmojis('money')[0]).toBe('💰');
    expect(suggestEmojis('xyzabc')).toEqual([]);
    expect(suggestEmojis('')).toEqual([]);
  });
  it('frase inteira sem repetir', () => {
    const s = suggestForText(['dinheiro', 'grana', 'fogo']);
    expect(new Set(s).size).toBe(s.length);
    expect(s).toContain('🔥');
  });
  it('withEmoji acrescenta e troca o emoji final, sem passar de 200', () => {
    expect(withEmoji('lucro', '💰')).toBe('lucro 💰');
    expect(withEmoji('lucro 💰', '🤑')).toBe('lucro 🤑');
    expect(withEmoji('a'.repeat(250), '🔥').length).toBeLessThanOrEqual(200);
  });
  it('texto com emoji continua passando na validação', () => {
    const p = createProject(video, words);
    p.phrases[0].words[0].text = withEmoji('Isso', '🔥');
    expect(validateProject(p).ok).toBe(true);
  });
});

describe('dividir nesta palavra + highlightScale', () => {
  it('splitPhrase na palavra do meio gera duas frases com tempos preservados', () => {
    const p = createProject(video, words);
    const ph = p.phrases[0];
    const out = splitPhrase(p.phrases, ph.id, 1);
    expect(out.length).toBe(p.phrases.length + 1);
    expect(out[0].words.map((w) => w.text)).toEqual(['Isso']);
    expect(out[1].words[0].text).toBe('vende');
    expect(out[1].id).not.toBe(out[0].id);
  });
  it('validate aceita highlightScale 1–3 e recusa absurdo', () => {
    const p = createProject(video, words);
    p.phrases[0].highlightScale = 1.3;
    expect(validateProject(p).ok).toBe(true);
    p.phrases[0].highlightScale = 50;
    expect(validateProject(p).ok).toBe(false);
  });
});

