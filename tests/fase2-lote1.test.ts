import { describe, expect, it } from 'vitest';
import { counterText } from '../src/core/motion';
import { retextPhrase, shiftPhrase } from '../src/core/grouping';
import type { Phrase } from '../src/core/types';

const ph = (words: [number, number][]): Phrase =>
  ({ id: 'p', words: words.map(([s, e], i) => ({ id: `w${i}`, text: `w${i}`, startMs: s, endMs: e })) }) as unknown as Phrase;

describe('#7 counterText com milhar e centavos', () => {
  it('não multiplica por 100', () => {
    expect(counterText('R$ 1.500,00', 1)).toBe('R$ 1.500,00');
    expect(counterText('$1,500.50', 1)).toBe('$1,500.50');
    expect(counterText('R$ 1.500,00', 0)).toBe('R$ 0,00');
  });
  it('mantém os casos antigos', () => {
    expect(counterText('260,000', 1)).toBe('260,000');
    expect(counterText('R$1.500', 1)).toBe('R$1.500');
    expect(counterText('2,5', 0)).toBe('2,5');
  });
});

describe('#8 shiftPhrase / retextPhrase', () => {
  it('shift negativo no começo não colapsa palavras', () => {
    const r = shiftPhrase(ph([[0, 300], [300, 600]]), -500);
    expect(r.words.map((w) => [w.startMs, w.endMs])).toEqual([[0, 300], [300, 600]]);
  });
  it('shift negativo parcial desloca tudo igual', () => {
    const r = shiftPhrase(ph([[200, 400], [400, 700]]), -500);
    expect(r.words.map((w) => [w.startMs, w.endMs])).toEqual([[0, 200], [200, 500]]);
  });
  it('retext de frase vazia ganha duração', () => {
    const r = retextPhrase(ph([]), 'oi mundo');
    expect(r.words.every((w) => w.endMs > w.startMs)).toBe(true);
  });
});
