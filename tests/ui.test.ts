// B6: helpers e fluxos da camada src/app/ (sem DOM): timecode, cloudHealth e Blob URLs do aparelho.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudHealth } from '../src/app/cloud';
import { timecode } from '../src/app/components/Preview';
import { devicePlatform } from '../src/app/platform/device';

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
