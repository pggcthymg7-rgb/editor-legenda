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
  it('upload aceita mp4 e serve em /media', async () => {
    const r = await fetch(`${base}/api/upload`, { method: 'POST', body: 'conteudo', headers: { ...W, 'x-file-ext': '.mp4' } });
    const body = await r.json();
    expect(body.url).toMatch(/^\/media\/m_[a-z0-9]+\.mp4$/);
    expect(await (await fetch(base + body.url)).text()).toBe('conteudo');
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
});
