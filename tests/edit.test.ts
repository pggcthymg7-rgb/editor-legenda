import { describe, expect, it } from 'vitest';
import { buildPhrase, createProject, phraseEnd, phraseStart } from '../src/core/grouping';
import { countMatches, duplicatePhrase, movePhraseTo, replaceAll, retimePhrase, setWordTime, snap, splitPhraseAt } from '../src/core/edit';

const W = (text: string, s: number, e: number) => ({ text, startMs: s, endMs: e });
const ph = () => buildPhrase([W('um', 1000, 1200), W('dois', 1200, 1600), W('três', 1600, 2000)], 'p1-editorial');

describe('edição na timeline', () => {
  it('retime mantém proporção', () => {
    const p = retimePhrase(ph(), 2000, 4000);
    expect(phraseStart(p)).toBe(2000);
    expect(phraseEnd(p)).toBe(4000);
    expect(p.words[1].startMs).toBe(2400);
  });
  it('mover não deixa tempo negativo', () => {
    expect(phraseStart(movePhraseTo(ph(), -500))).toBe(0);
    expect(phraseEnd(movePhraseTo(ph(), 3000))).toBe(4000);
  });
  it('tempo da palavra não invade vizinhas', () => {
    const p = ph();
    const q = setWordTime(p, p.words[1].id, 900, 2500);
    expect(q.words[1].startMs).toBeGreaterThanOrEqual(q.words[0].startMs + 40);
    expect(q.words[1].endMs).toBeLessThanOrEqual(q.words[2].endMs - 40);
    expect(q.words[0].endMs).toBeLessThanOrEqual(q.words[1].startMs);
  });
  it('divide no tempo da agulha', () => {
    const p = ph();
    const out = splitPhraseAt([p], p.id, 1500);
    expect(out).toHaveLength(2);
    expect(out[0].words.map((w) => w.text)).toEqual(['um', 'dois']);
  });
  it('duplica com ids novos depois do fim', () => {
    const p = ph();
    const { phrases, id } = duplicatePhrase([p], p.id);
    expect(phrases).toHaveLength(2);
    const d = phrases.find((x) => x.id === id)!;
    expect(phraseStart(d)).toBe(2000);
    expect(d.words[0].id).not.toBe(p.words[0].id);
  });
  it('buscar e substituir (palavra inteira, sem caixa)', () => {
    const proj = createProject({ src: '', width: 720, height: 1280, durationMs: 9000, fps: 30 }, [W('Oi', 0, 200), W('oi,', 200, 400), W('oito', 400, 800)]);
    expect(countMatches(proj, 'oi', { wholeWord: true })).toBe(2);
    const { project, count } = replaceAll(proj, 'oi', 'olá', { wholeWord: true });
    expect(count).toBe(2);
    expect(project.phrases.flatMap((p) => p.words.map((w) => w.text))).toEqual(['olá', 'olá,', 'oito']);
  });
  it('busca com caracteres especiais não quebra', () => {
    const proj = createProject({ src: '', width: 720, height: 1280, durationMs: 9000, fps: 30 }, [W('R$10', 0, 200)]);
    expect(countMatches(proj, 'R$1')).toBe(1);
    expect(countMatches(proj, '(')).toBe(0);
  });
  it('snap encaixa dentro da tolerância', () => {
    expect(snap(1030, [0, 1000, 2000], 50)).toBe(1000);
    expect(snap(1100, [0, 1000, 2000], 50)).toBe(1100);
  });
});
