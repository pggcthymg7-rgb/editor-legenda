// B6: helpers e fluxos da camada src/app/ (sem DOM): timecode, cloudHealth e Blob URLs do aparelho.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudHealth } from '../src/app/cloud';
import { timecode, timecodeShort } from '../src/app/components/Preview';
import { applyGeneratedPhrases } from '../src/app/mobile/MobileAutoCaptionsSheet';
import { msToTimelineX, timelineXToMs } from '../src/app/mobile/MobileTimeline';
import { cn } from '../src/app/mobile/utils';
import { devicePlatform } from '../src/app/platform/device';
import { buildPhrase, createProject } from '../src/core/grouping';

describe('timecode do monitor', () => {
  it('formata mm:ss:quadros e não fica negativo', () => {
    expect(timecode(0)).toBe('00:00:00');
    expect(timecode(-500)).toBe('00:00:00');
    expect(timecode(61_500)).toBe('01:01:15');
    expect(timecode(59_999)).toBe('00:59:29');
  });
});

describe('cloudHealth', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.advanceTimersByTime(60_001); // solta o cache entre testes
    vi.useRealTimers();
  });

  it('não guarda "offline": a próxima chamada tenta de novo', async () => {
    const down = vi.fn(async () => {
      throw new Error('rede');
    }) as unknown as typeof fetch;
    expect(await cloudHealth(down)).toBe('offline');
    const up = vi.fn(async () => new Response(JSON.stringify({ ready: true }), { status: 200 })) as unknown as typeof fetch;
    expect(await cloudHealth(up)).toBe('ready');
    expect(up).toHaveBeenCalledTimes(1);
  });

  it('guarda resposta boa por 60 s', async () => {
    const up = vi.fn(async () => new Response(JSON.stringify({ ready: true }), { status: 200 })) as unknown as typeof fetch;
    expect(await cloudHealth(up)).toBe('ready');
    expect(await cloudHealth(up)).toBe('ready');
    expect(up).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_001);
    expect(await cloudHealth(up)).toBe('ready');
    expect(up).toHaveBeenCalledTimes(2);
  });

  it('HTTP com erro conta como offline e não fica em cache', async () => {
    const bad = vi.fn(async () => new Response('x', { status: 502 })) as unknown as typeof fetch;
    expect(await cloudHealth(bad)).toBe('offline');
    expect(await cloudHealth(bad)).toBe('offline');
    expect(bad).toHaveBeenCalledTimes(2);
  });
});

describe('aparelho: Blob URLs ao trocar de projeto', () => {
  it('revoga o vídeo anterior ao abrir outro e tudo ao clicar em "Novo"', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const a = await devicePlatform.saveVideo(new File([new Uint8Array([1])], 'a.mp4', { type: 'video/mp4' }), () => undefined);
    const b = await devicePlatform.saveVideo(new File([new Uint8Array([2])], 'b.mp4', { type: 'video/mp4' }), () => undefined);
    const urlA = await devicePlatform.videoUrl(a.src);
    expect(await devicePlatform.videoUrl(a.src)).toBe(urlA); // cache
    expect(revoke).not.toHaveBeenCalledWith(urlA);

    const urlB = await devicePlatform.videoUrl(b.src);
    expect(revoke).toHaveBeenCalledWith(urlA);
    expect(revoke).not.toHaveBeenCalledWith(urlB);

    expect(await devicePlatform.videoUrl('')).toBe('');
    expect(revoke).toHaveBeenCalledWith(urlB);
    revoke.mockRestore();
  });

  it('URL remota passa direto, sem Blob', async () => {
    expect(await devicePlatform.videoUrl('https://x.test/v.mp4')).toBe('https://x.test/v.mp4');
  });
});

describe('CapCut Mobile: timecode curto, matemática da agulha central e substituição de legendas', () => {
  it('formata timecodeShort mm:ss para a barra de transporte mobile', () => {
    expect(timecodeShort(0)).toBe('00:00');
    expect(timecodeShort(-200)).toBe('00:00');
    expect(timecodeShort(65_400)).toBe('01:05');
  });

  it('converte tempo (ms) <-> scrollLeft (px) sob a agulha central fixa', () => {
    const scale = 100; // 100 px/s
    expect(msToTimelineX(0, scale)).toBe(0);
    expect(msToTimelineX(2500, scale)).toBe(250);
    expect(timelineXToMs(250, scale, 10_000)).toBe(2500);
    expect(timelineXToMs(-50, scale, 10_000)).toBe(0);
    expect(timelineXToMs(9999, scale, 10_000)).toBe(10_000);
  });

  it('applyGeneratedPhrases substitui quando clearExisting=true e mescla ordenado quando false', () => {
    const baseProj = createProject(
      { src: 'idb://v1', width: 1080, height: 1920, durationMs: 10_000, fps: 30 },
      [{ text: 'Antiga', startMs: 1000, endMs: 1800 }],
      'Teste',
    );
    const newPhrase = buildPhrase([{ text: 'Nova', startMs: 500, endMs: 900 }], 'p1-editorial');

    const replaced = applyGeneratedPhrases(baseProj, [newPhrase], true);
    expect(replaced.phrases).toHaveLength(1);
    expect(replaced.phrases[0].words[0].text).toBe('Nova');

    const merged = applyGeneratedPhrases(baseProj, [newPhrase], false);
    expect(merged.phrases).toHaveLength(2);
    expect(merged.phrases[0].words[0].text).toBe('Nova');
    expect(merged.phrases[1].words[0].text).toBe('Antiga');
  });

  it('cn combina classes Tailwind do escopo mobile', () => {
    expect(cn('px-2', undefined, null, false, 'py-1')).toBe('px-2 py-1');
  });
});

