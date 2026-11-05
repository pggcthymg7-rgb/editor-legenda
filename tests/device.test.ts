// Versão iPhone (PWA): armazenamento no aparelho e chamada direta à OpenAI.
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createProject } from '../src/core/grouping';
import { devicePlatform, DEVICE_FORMATS } from '../src/app/platform/device';
import { buildTranscriptionForm, isPlausibleKey, OPENAI_URL, transcribeWithKey } from '../src/app/platform/openai-browser';

const meta = { width: 1080, height: 1920, durationMs: 4000, fps: 30 };
const words = [
  { text: 'Oi', startMs: 0, endMs: 300 },
  { text: 'gente', startMs: 300, endMs: 700 },
];

describe('aparelho: vídeo e projetos no IndexedDB', () => {
  it('guarda vídeo como local:<id>, salva, lista, carrega e apaga', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'reel.mp4', { type: 'video/mp4' });
    const saved = await devicePlatform.saveVideo(file, () => undefined);
    expect(saved.src).toMatch(/^local:[a-zA-Z0-9_-]+$/);

    const url = await devicePlatform.videoUrl(saved.src);
    expect(url.startsWith('blob:')).toBe(true);

    const p = createProject({ src: saved.src, ...meta }, words, 'Meu reel');
    await devicePlatform.saveProject(p);
    expect(await devicePlatform.listProjects()).toEqual([{ id: p.id, name: 'Meu reel' }]);
    const loaded = await devicePlatform.loadProject(p.id);
    expect(loaded.phrases.length).toBe(p.phrases.length);

    await devicePlatform.deleteProject!(p.id);
    expect(await devicePlatform.listProjects()).toEqual([]);
    await expect(devicePlatform.videoUrl(saved.src)).rejects.toThrow(/não encontrado/);
  });

  it('não salva projeto inválido (ex.: script no texto)', async () => {
    const p = createProject({ src: 'local:abc', ...meta }, words, 'x');
    p.phrases[0].words[0].text = '<script>alert(1)</script>';
    await expect(devicePlatform.saveProject(p)).rejects.toThrow();
  });

  it('não gera MOV ProRes no aparelho', () => {
    expect(DEVICE_FORMATS['mov-alpha']).toBeUndefined();
    expect(DEVICE_FORMATS['mp4-green']?.background).toBe('green');
    expect(DEVICE_FORMATS['mp4-final']?.muted).toBe(false);
  });
});

describe('aparelho: OpenAI direto com a chave do usuário', () => {
  const key = 'sk-test_' + 'a'.repeat(40);
  const audio = new Blob([new Uint8Array(100)], { type: 'audio/mp4' });

  it('monta o pedido certo', () => {
    const f = buildTranscriptionForm(audio, 'audio.m4a');
    expect(f.get('model')).toBe('whisper-1');
    expect(f.get('language')).toBe('pt');
    expect(f.get('response_format')).toBe('verbose_json');
    expect(f.getAll('timestamp_granularities[]')).toEqual(['word']);
  });

  it('envia para a OpenAI com Bearer e converte palavras', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ words: [{ word: 'Oi', start: 0, end: 0.3 }], text: 'Oi.' }), { status: 200 }),
    );
    const out = await transcribeWithKey(key, audio, 'audio.m4a', fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(OPENAI_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${key}`);
    expect(out[0]).toMatchObject({ startMs: 0, endMs: 300 });
  });

  it('erro não vaza a chave nem o corpo da resposta', async () => {
    const fetchImpl = async () => new Response(`{"error":"bad key ${key}"}`, { status: 401 });
    const err = await transcribeWithKey(key, audio, 'a.m4a', fetchImpl as typeof fetch).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toContain(key);
    expect((err as Error).message).not.toContain('bad key');
  });

  it('recusa áudio acima de 25 MB sem chamar a API', async () => {
    const fetchImpl = vi.fn();
    const big = { size: 26 * 1024 * 1024 } as Blob;
    await expect(transcribeWithKey(key, big, 'a.m4a', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/25 MB/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('valida formato da chave', () => {
    expect(isPlausibleKey(key)).toBe(true);
    expect(isPlausibleKey('abc')).toBe(false);
    expect(isPlausibleKey('sk-<script>')).toBe(false);
  });
});

import { deviceScale } from '../src/app/platform/device';
describe('export no aparelho', () => {
  it('limita a 1080 de largura', () => {
    expect(deviceScale(720)).toBe(1);
    expect(deviceScale(2160)).toBeCloseTo(0.5);
    expect(Math.round(3840 * deviceScale(2160)) % 2).toBe(0);
  });
});
