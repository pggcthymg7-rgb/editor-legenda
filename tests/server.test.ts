import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.EDITOR_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'editor-legenda-'));

let base = '';
let close: () => void = () => undefined;

beforeAll(async () => {
  const { app } = await import('../server/index');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

const W = { 'x-editor': '1' };
const project = (over: Record<string, unknown> = {}) => ({
  version: 1,
  id: 'proj_teste',
  name: 'Teste',
  video: { src: '', width: 720, height: 1280, durationMs: 1000, fps: 30 },
  phrases: [],
  customPresets: [],
  ...over,
});

describe('servidor (segurança)', () => {
  it('manda cabeçalhos de segurança', async () => {
    const r = await fetch(`${base}/api/status`);
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-powered-by')).toBeNull();
  });
  it('status responde', async () => {
    const r = await fetch(`${base}/api/status`);
    expect(r.status).toBe(200);
    expect(await r.json()).toHaveProperty('formats');
  });
  it('POST sem header x-editor é bloqueado (CSRF)', async () => {
    const r = await fetch(`${base}/api/upload`, { method: 'POST', body: 'x', headers: { 'x-file-ext': '.mp4' } });
    expect(r.status).toBe(403);
  });
  it('Host externo é bloqueado (DNS rebinding)', async () => {
    const { request } = await import('node:http');
    const status = await new Promise<number>((resolve) => {
      const u = new URL(base);
      request({ host: u.hostname, port: u.port, path: '/api/status', headers: { host: 'evil.com' } }, (res) => resolve(res.statusCode!)).end();
    });
    expect(status).toBe(403);
  });
  it('upload recusa extensão não permitida', async () => {
    const r = await fetch(`${base}/api/upload`, { method: 'POST', body: 'x', headers: { ...W, 'x-file-ext': '.sh' } });
    expect(r.status).toBe(400);
  });
  it('upload recusa arquivo com assinatura binária inválida (magic bytes)', async () => {
    // Tenta enviar GIF como se fosse MP4
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
    const r = await fetch(`${base}/api/upload`, { method: 'POST', body: gif, headers: { ...W, 'x-file-ext': '.mp4' } });
    expect(r.status).toBe(415);
  });
  it('upload aceita mp4 com magic bytes válidos e serve em /media', async () => {
    // Cabeçalho ISO box mínimo com 'ftyp' no offset 4
    const mp4 = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const r = await fetch(`${base}/api/upload`, { method: 'POST', body: mp4, headers: { ...W, 'x-file-ext': '.mp4' } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.url).toMatch(/^\/media\/m_[a-z0-9]+\.mp4$/);
    const downloaded = new Uint8Array(await (await fetch(base + body.url)).arrayBuffer());
    expect(downloaded.slice(0, 12)).toEqual(mp4);
  });
  it('upload aceita webm com magic bytes válidos (1A 45 DF A3)', async () => {
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81]);
    const r = await fetch(`${base}/api/upload`, { method: 'POST', body: webm, headers: { ...W, 'x-file-ext': '.webm' } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.url).toMatch(/^\/media\/m_[a-z0-9]+\.webm$/);
  });
  it('/media não sai da pasta', async () => {
    const r = await fetch(`${base}/media/..%2F..%2Fpackage.json`);
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
  it('salva e carrega projeto', async () => {
    const put = await fetch(`${base}/api/projects/proj_teste`, {
      method: 'PUT',
      headers: { ...W, 'content-type': 'application/json' },
      body: JSON.stringify(project()),
    });
    expect(put.status).toBe(200);
    const got = await (await fetch(`${base}/api/projects/proj_teste`)).json();
    expect(got.name).toBe('Teste');
  });
  it('recusa id de projeto com path traversal', async () => {
    const r = await fetch(`${base}/api/projects/..%2F..%2Fx`, { method: 'PUT', headers: { ...W, 'content-type': 'application/json' }, body: '{}' });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
  it('render recusa formato e projeto inválidos', async () => {
    const send = (b: unknown) =>
      fetch(`${base}/api/render`, { method: 'POST', headers: { ...W, 'content-type': 'application/json' }, body: JSON.stringify(b) });
    expect((await send({ project: project(), format: 'exe' })).status).toBe(400);
    expect((await send({ project: project({ video: { src: 'http://x/y.mp4', width: 1, height: 1, durationMs: 1, fps: 30 } }), format: 'mp4-green' })).status).toBe(400);
  });
  it('transcrição OpenAI sem chave dá erro claro', async () => {
    delete process.env.OPENAI_API_KEY;
    const r = await fetch(`${base}/api/transcribe/openai`, {
      method: 'POST',
      headers: { ...W, 'content-type': 'application/json' },
      body: JSON.stringify({ name: '../../etc/passwd' }),
    });
    expect(r.status).toBe(400);
  });

  it('máscaras: aceita JPEG, recusa outros tipos, ids e índices inválidos', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
    const put = (path: string, body: Uint8Array, type = 'image/jpeg', h: Record<string, string> = W) =>
      fetch(`${base}/api/masks/${path}`, { method: 'PUT', headers: { ...h, 'content-type': type }, body });
    expect((await put('m_teste/0', jpeg)).status).toBe(200);
    const got = await fetch(`${base}/media/masks/m_teste/0.jpg`);
    expect(got.status).toBe(200);
    expect((await put('m_teste/1', new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).status).toBe(400); // PNG não
    expect((await put('m_teste/1', jpeg, 'text/html')).status).toBe(400);
    expect((await put('..%2F..%2Fetc/1', jpeg)).status).toBe(400);
    expect((await put('m_teste/-1', jpeg)).status).toBe(400);
    expect((await put('m_teste/abc', jpeg)).status).toBe(400);
    expect((await put('m_teste/2', jpeg, 'image/jpeg', {})).status).toBe(403); // sem x-editor (CSRF)
    const del = await fetch(`${base}/api/masks/m_teste`, { method: 'DELETE', headers: W });
    expect(del.status).toBe(200);
    expect((await fetch(`${base}/media/masks/m_teste/0.jpg`)).status).toBe(404);
  });
  it('CORS de /media só para origem local', async () => {
    const local = await fetch(`${base}/media/nada.jpg`, { headers: { origin: 'http://localhost:3000' } });
    expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    const evil = await fetch(`${base}/media/nada.jpg`, { headers: { origin: 'https://evil.com' } });
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('render recusa camada inválida e camada da pessoa sem análise', async () => {
    const body = (layer: string) => JSON.stringify({ project: project(), format: 'mp4-green', layer });
    const r1 = await fetch(`${base}/api/render`, { method: 'POST', headers: { ...W, 'content-type': 'application/json' }, body: body('x') });
    expect(r1.status).toBe(400);
    const r2 = await fetch(`${base}/api/render`, { method: 'POST', headers: { ...W, 'content-type': 'application/json' }, body: body('person') });
    expect(r2.status).toBe(400);
  });
  it('cancelar render: exige x-editor e responde 404 para job inexistente', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    expect((await fetch(`${base}/api/render/${id}`, { method: 'DELETE' })).status).toBe(403);
    expect((await fetch(`${base}/api/render/${id}`, { method: 'DELETE', headers: W })).status).toBe(404);
  });
  it('invariantes de segurança do projeto (validate, CSP, MediaPipe, modelo offline)', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const val = readFileSync('src/core/validate.ts', 'utf8');
    expect(val).toContain('url\\s*\\(');
    expect(val).toContain('<\\/?script');
    const viteCfg = readFileSync('vite.config.ts', 'utf8');
    expect(viteCfg).toContain('Content-Security-Policy');
    expect(viteCfg).toContain('mediapipe-wasm');
    expect(existsSync('public/models/selfie_multiclass_256x256.tflite')).toBe(true);
  });
});

describe('safeMediaName e bordas de storage', () => {
  it('rejeita caracteres especiais e caminhos relativos em safeMediaName', async () => {
    const { safeMediaName } = await import('../server/storage');
    expect(safeMediaName('m_123.mp4')).toBe('m_123.mp4');
    expect(safeMediaName('m_123.mov')).toBe('m_123.mov');
    expect(safeMediaName('m_123.webm')).toBe('m_123.webm');
    expect(safeMediaName('../m_123.mp4')).toBeNull();
    expect(safeMediaName('m_123.sh')).toBeNull();
    expect(safeMediaName('m_123;rm -rf /')).toBeNull();
    expect(safeMediaName('m_123\0.mp4')).toBeNull();
    expect(safeMediaName(null)).toBeNull();
    expect(safeMediaName({})).toBeNull();
  });
});

describe('track3d job cleanup e prune', () => {
  it('limpa jobs antigos com mais de 30 minutos', async () => {
    const { _test } = await import('../server/track3d');
    const now = Date.now();
    _test.jobs.set('t3_antigo', {
      id: 't3_antigo',
      status: 'done',
      progress: 1,
      stage: 'done',
      startedAt: now - 35 * 60 * 1000,
    });
    _test.jobs.set('t3_recente', {
      id: 't3_recente',
      status: 'done',
      progress: 1,
      stage: 'done',
      startedAt: now - 5 * 60 * 1000,
    });
    _test.pruneTrackJobs(now);
    expect(_test.jobs.has('t3_antigo')).toBe(false);
    expect(_test.jobs.has('t3_recente')).toBe(true);
    _test.jobs.clear();
  });
});
