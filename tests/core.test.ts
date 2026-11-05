import { describe, expect, it } from 'vitest';
import { assignRoles, buildPhrases, createProject, groupWords, mergeWithNext, phraseVisibleEnd, retextPhrase, splitPhrase } from '../src/core/grouping';
import { computeLines } from '../src/core/layout';
import { counterText, entranceState, exitState, wordMotion, wordWindows } from '../src/core/motion';
import { PRESETS, findPreset, resolveWordStyle } from '../src/core/presets';
import { assColor, assTime, srtTime, toAss, toSrt } from '../src/core/exporters';
import { attachPunctuation, fromOpenAi, fromRemotionCaptions } from '../src/core/transcript';
import { validateProject } from '../src/core/validate';
import type { TranscribedWord } from '../src/core/types';

const W = (text: string, startMs: number, endMs = startMs + 250): TranscribedWord => ({ text, startMs, endMs });
const video = { src: '/media/m_abc.mp4', width: 720, height: 1280, durationMs: 10000, fps: 30 };

describe('papéis', () => {
  it('ligação pequena, maior palavra vira chave', () => {
    expect(assignRoles(['com', 'uma', 'ponte', 'no', 'telhado?'])).toEqual(['small', 'small', 'normal', 'small', 'key']);
  });
  it('número sempre é chave', () => {
    expect(assignRoles(['74%', 'dos', 'proprietários'])).toEqual(['key', 'small', 'normal']);
  });
  it('só ligações: sem chave', () => {
    expect(assignRoles(['e', 'o'])).toEqual(['small', 'small']);
  });
});

describe('agrupamento', () => {
  it('quebra por pausa, pontuação e limite', () => {
    const g = groupWords([W('Oi,', 0), W('tudo', 300), W('bem', 600), W('hoje', 2000), W('a', 2300), W('b', 2600), W('c', 2900), W('d', 3200)], {
      gapMs: 400,
      maxWords: 3,
    });
    expect(g.map((x) => x.map((w) => w.text).join(' '))).toEqual(['Oi,', 'tudo bem', 'hoje a b', 'c d']);
  });
  it('ignora palavras vazias', () => {
    expect(groupWords([W(' ', 0), W('ok', 10)], { gapMs: 400, maxWords: 4 })).toHaveLength(1);
  });
  it('modelo automático: hook, número, corpo', () => {
    const ph = buildPhrases([W('Você', 0), W('já', 300), W('viu.', 600), W('73%', 7000), W('casa', 9000), W('linda.', 9300)]);
    expect(ph.map((p) => p.presetId)).toEqual(['p2-serif-lilas', 'p6-neon', 'p3-palavra-unica']);
  });
  it('frase vazia não quebra projeto', () => {
    expect(createProject(video, []).phrases).toEqual([]);
  });
});

describe('edição de frases', () => {
  const p = createProject(video, [W('um', 0), W('dois', 300), W('três', 600), W('quatro.', 900)]);
  it('dividir e juntar são inversos', () => {
    const id = p.phrases[0].id;
    const split = splitPhrase(p.phrases, id, 2);
    expect(split).toHaveLength(2);
    const merged = mergeWithNext(split, id);
    expect(merged[0].words.map((w) => w.text)).toEqual(['um', 'dois', 'três', 'quatro.']);
  });
  it('reescrever com mais palavras redistribui tempo dentro da frase', () => {
    const r = retextPhrase(p.phrases[0], 'a b c d e');
    expect(r.words).toHaveLength(5);
    expect(r.words[0].startMs).toBe(0);
    expect(r.words[4].endMs).toBe(p.phrases[0].words[3].endMs);
  });
  it('mesmo número de palavras mantém tempos', () => {
    const r = retextPhrase(p.phrases[0], 'A B C D');
    expect(r.words.map((w) => w.startMs)).toEqual(p.phrases[0].words.map((w) => w.startMs));
  });
  it('segurar no fim não invade a próxima frase', () => {
    const pr = createProject(video, [W('oi.', 0, 200), W('tchau.', 400, 600)]);
    expect(phraseVisibleEnd(pr.phrases, 0, 1000)).toBe(400);
    expect(phraseVisibleEnd(pr.phrases, 1, 1000)).toBe(1600);
  });
});

describe('layout', () => {
  it('stack separa ligações de palavras grandes', () => {
    const p = createProject(video, [W('com', 0), W('uma', 100), W('ponte', 200), W('no', 300)]).phrases[0];
    expect(computeLines(p.words, 'stack').map((l) => l.map((w) => w.text))).toEqual([['com', 'uma'], ['ponte'], ['no']]);
  });
  it('inline é uma linha', () => {
    const p = createProject(video, [W('a', 0), W('casa', 100)]).phrases[0];
    expect(computeLines(p.words, 'inline')).toHaveLength(1);
  });
});

describe('animação', () => {
  it('entradas começam invisíveis e terminam no estado final', () => {
    for (const e of ['blurUp', 'pop', 'fade', 'slideUp', 'zoomIn'] as const) {
      expect(entranceState(e, 0).opacity).toBeCloseTo(0, 1);
      const end = entranceState(e, 1);
      expect(end.opacity).toBeCloseTo(1);
      expect(end.blur).toBeCloseTo(0);
      expect(end.scale).toBeCloseTo(1);
    }
  });
  it('saídas terminam invisíveis', () => {
    for (const e of ['blurOut', 'fade', 'zoomOut', 'none'] as const) expect(exitState(e, 1).opacity).toBeCloseTo(0);
  });
  it('modo uma-palavra troca a palavra no início da próxima', () => {
    const p = createProject(video, [W('isso', 10000, 10200), W('mesmo', 10300, 10500)]).phrases[0];
    const anim = { ...findPreset('p3-palavra-unica').animation };
    const wins = wordWindows(p, anim, 11000);
    expect(wins[0]).toEqual({ inMs: 10000, outMs: 10300 });
    expect(wordMotion(10350, wins[0], anim)).toBeNull();
    expect(wordMotion(10350, wins[1], anim)).not.toBeNull();
  });
  it('contador mantém formato', () => {
    expect(counterText('260,000', 1)).toBe('260,000');
    expect(counterText('73%', 1)).toBe('73%');
    expect(counterText('73%', 0)).toBe('0%');
    expect(counterText('R$1.500', 1)).toBe('R$1.500');
    expect(counterText('2,5', 0)).toBe('2,5');
  });
});

describe('modelos', () => {
  it('8 modelos com ids únicos', () => {
    expect(PRESETS).toHaveLength(8);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(8);
  });
  it('override de palavra vence frase que vence modelo', () => {
    const pr = PRESETS[0];
    const s = resolveWordStyle(pr, 'key', { key: { fontSize: 10, italic: true } }, { fontSize: 20 });
    expect(s.fontSize).toBe(20);
    expect(s.italic).toBe(true);
    expect(s.fontFamily).toBe(pr.roles.key.fontFamily);
  });
  it('id desconhecido cai no padrão', () => {
    expect(findPreset('xyz').id).toBe('p3-palavra-unica');
  });
});

describe('export', () => {
  const proj = createProject(video, [W('Você', 0, 300), W('viu', 300, 600), W('isso?', 600, 1234)]);
  it('tempos SRT/ASS', () => {
    expect(srtTime(3723004)).toBe('01:02:03,004');
    expect(assTime(3723004)).toBe('1:02:03.00');
  });
  it('SRT válido', () => {
    expect(toSrt(proj)).toBe('1\n00:00:00,000 --> 00:00:01,234\nVocê viu isso?\n');
  });
  it('ASS tem cabeçalho, resolução e posição', () => {
    const ass = toAss(proj);
    expect(ass).toContain('PlayResX: 720');
    expect(ass).toContain('PlayResY: 1280');
    expect(ass).toMatch(/Dialogue: 0,0:00:00\.00,0:00:01\.23,Default,,0,0,0,,\{\\an5\\pos\(\d+,\d+\)/);
    expect(ass).toContain('Você');
    expect(ass).not.toMatch(/\\1c&(?!H[0-9A-F]{6}&)/); // cor nunca vazia
  });
  it('ASS leva escala X/Y da palavra e nome da fonte nova', () => {
    const p2 = structuredClone(proj);
    p2.phrases[0].words[0].scaleX = 1.5;
    p2.phrases[0].words[0].scaleY = 0.5;
    p2.phrases[0].words[0].style = { fontFamily: 'bebas' };
    const ass = toAss(p2);
    expect(ass).toContain('\\fscx150\\fscy50');
    expect(ass).toContain('\\fnBebas Neue');
  });
  it('cor ASS é BGR com alfa invertido', () => {
    expect(assColor('#FF0000')).toBe('&H000000FF');
    expect(assColor('rgba(0,0,255,0.5)')).toBe('&H80FF0000');
  });
});

describe('transcrição', () => {
  it('captions do Remotion: junta pedaços sem espaço', () => {
    expect(
      fromRemotionCaptions([
        { text: ' Olá', startMs: 0, endMs: 200 },
        { text: ',', startMs: 200, endMs: 220 },
        { text: ' mundo', startMs: 300, endMs: 500 },
      ]),
    ).toEqual([
      { text: 'Olá,', startMs: 0, endMs: 220 },
      { text: 'mundo', startMs: 300, endMs: 500 },
    ]);
  });
  it('OpenAI: segundos → ms e pontuação recolocada', () => {
    const r = fromOpenAi({ text: 'Oi, tudo bem?', words: [{ word: 'Oi', start: 0, end: 0.2 }, { word: 'tudo', start: 0.3, end: 0.5 }, { word: 'bem', start: 0.5, end: 0.8 }] });
    expect(r.map((w) => w.text)).toEqual(['Oi,', 'tudo', 'bem?']);
    expect(r[1].startMs).toBe(300);
  });
  it('pontuação: palavra não encontrada fica como veio', () => {
    expect(attachPunctuation([W('xyz', 0)], 'abc.')[0].text).toBe('xyz');
  });
});

describe('validação (segurança)', () => {
  const ok = createProject(video, [W('oi', 0)]);
  it('aceita projeto normal', () => {
    expect(validateProject(ok).ok).toBe(true);
  });
  it('rejeita src fora de /media (path traversal / URL externa)', () => {
    for (const src of ['/media/../../etc/passwd', 'file:///etc/passwd', 'http://evil.com/x.mp4']) {
      expect(validateProject({ ...ok, video: { ...ok.video, src } }).ok).toBe(false);
    }
  });
  it('aceita vídeo do aparelho (local:<id>) e rejeita variações perigosas', () => {
    expect(validateProject({ ...ok, video: { ...ok.video, src: 'local:abc_123-X' } }).ok).toBe(true);
    for (const src of ['local:', 'local:../x', 'local:a/b', 'local:a b', 'local:' + 'a'.repeat(65), 'blob:http://x/1']) {
      expect(validateProject({ ...ok, video: { ...ok.video, src } }).ok).toBe(false);
    }
  });
  it('valida escala por palavra, fonte e destaque', () => {
    const good = structuredClone(ok);
    Object.assign(good.phrases[0].words[0], { scaleX: 1.5, scaleY: 0.7, dx: 10 });
    good.phrases[0].highlight = { fontFamily: 'bebas' };
    good.phrases[0].behind = true;
    expect(validateProject(good).ok).toBe(true);
    const bad = structuredClone(ok);
    bad.phrases[0].words[0].scaleX = 0;
    expect(validateProject(bad).ok).toBe(false);
    const badFont = structuredClone(ok);
    badFont.phrases[0].roleStyles = { key: { fontFamily: 'Arial;x' as never } };
    expect(validateProject(badFont).ok).toBe(false);
  });
  it('rejeita CSS com url() e script', () => {
    const bad = structuredClone(ok);
    bad.phrases[0].words[0].text = '<script>alert(1)</script>';
    expect(validateProject(bad).ok).toBe(false);
    const bad2 = structuredClone(ok);
    bad2.phrases[0].roleStyles = { key: { fill: { type: 'solid', color: 'red;background:url(http://x)' } } };
    expect(validateProject(bad2).ok).toBe(false);
  });
  it('rejeita números inválidos e tipos errados', () => {
    expect(validateProject({ ...ok, phrases: [{ ...ok.phrases[0], x: Infinity }] }).ok).toBe(false);
    expect(validateProject(null).ok).toBe(false);
    expect(validateProject({ ...ok, version: 2 }).ok).toBe(false);
  });
});
