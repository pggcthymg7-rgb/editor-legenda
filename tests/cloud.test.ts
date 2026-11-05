// Proxy de transcrição na nuvem: origem, header, limite, tipos, sem vazar erro do provedor.
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
const APP = 'https://editor-legenda.onrender.com';

let base = '';
let mod: typeof import('../cloud/proxy.mjs');
const realFetch = globalThis.fetch;

beforeAll(async () => {
  mod = await import('../cloud/proxy.mjs');
  mod.server.listen(0, '127.0.0.1');
  await new Promise((r) => mod.server.once('listening', r));
  base = `http://127.0.0.1:${(mod.server.address() as AddressInfo).port}`;
});
afterAll(() => {
  mod.server.close();
  vi.unstubAllGlobals();
  delete process.env.GROQ_API_KEY;
});

const audio = new Uint8Array(500);
const post = (h: Record<string, string> = {}, body: BodyInit = audio, q = '') =>
  realFetch(`${base}/transcribe${q}`, { method: 'POST', headers: { origin: APP, 'x-app': 'legendas', 'content-type': 'audio/mp4', ...h }, body });

describe('proxy da nuvem', () => {
  it('health diz se tem chave', async () => {
    const r = await realFetch(`${base}/health`, { headers: { origin: APP } });
    expect(await r.json()).toMatchObject({ ok: true, ready: false });
    expect(r.headers.get('access-control-allow-origin')).toBe(APP);
  });
  it('sem chave responde 503 claro', async () => {
    expect((await post()).status).toBe(503);
  });
  it('bloqueia outra origem, falta de header e tipo errado', async () => {
    expect((await post({ origin: 'https://evil.com' })).status).toBe(403);
    expect((await post({ 'x-app': 'x' })).status).toBe(403);
    expect((await post({ 'content-type': 'text/html' })).status).toBe(415);
    const pre = await realFetch(`${base}/transcribe`, { method: 'OPTIONS', headers: { origin: 'https://evil.com' } });
    expect(pre.status).toBe(403);
    const ok = await realFetch(`${base}/transcribe`, { method: 'OPTIONS', headers: { origin: APP } });
    expect(ok.status).toBe(204);
  });
  it('repassa ao Groq com a chave só no servidor e devolve só palavras', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_123';
    const calls: [string, RequestInit][] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (String(url).startsWith('https://api.groq.com')) {
        calls.push([url, init]);
        return new Response(JSON.stringify({ text: 'Oi gente', words: [{ word: 'Oi', start: 0, end: 0.3 }], x_groq: { id: 'segredo' } }));
      }
      return realFetch(url, init);
    });
    const r = await post({}, audio, '?lang=pt');
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toEqual({ text: 'Oi gente', words: [{ word: 'Oi', start: 0, end: 0.3 }] });
    expect((calls[0][1].headers as Record<string, string>).authorization).toBe('Bearer gsk_test_123');
    const form = calls[0][1].body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3-turbo');
    expect(form.getAll('timestamp_granularities[]')).toEqual(['word']);
    expect(JSON.stringify(body)).not.toContain('gsk_');
  });
  it('erro do provedor não vaza corpo', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) =>
      String(url).startsWith('https://api.groq.com') ? new Response('{"error":"conta xyz"}', { status: 401 }) : realFetch(url, init),
    );
    const r = await post();
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('conta xyz');
  });
  it('idioma inválido e limite por IP', async () => {
    expect((await post({}, audio, '?lang=pt-BR;x')).status).toBe(400);
    let blocked = false;
    for (let i = 0; i < 200 && !blocked; i++) blocked = !mod.allow('9.9.9.9', 1000);
    expect(blocked).toBe(true);
  });
  it('slim filtra lixo', () => {
    expect(mod.slim({ words: [{ word: 'a', start: 0, end: 1 }, { word: 1 }, null], text: 5 })).toEqual({ text: '', words: [{ word: 'a', start: 0, end: 1 }] });
  });
});

describe('chave do usuário', () => {
  it('usa a chave Groq do usuário só se o servidor não tiver e se o formato for válido', () => {
    expect(mod.provider({}, 'gsk_' + 'a'.repeat(30))?.key).toBe('gsk_' + 'a'.repeat(30));
    expect(mod.provider({}, 'sk-abc')).toBeNull();
    expect(mod.provider({}, 'gsk_x\nInjected')).toBeNull();
    expect(mod.provider({ GROQ_API_KEY: 'gsk_server' }, 'gsk_' + 'b'.repeat(30))?.key).toBe('gsk_server');
  });
});
