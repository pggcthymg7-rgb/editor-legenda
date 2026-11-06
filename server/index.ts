// Servidor local do editor. Escuta só em 127.0.0.1 (não aparece na rede).
import express, { type NextFunction, type Request, type Response } from 'express';
import { execFile } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { newId } from '../src/core/grouping';
import { validateProject } from '../src/core/validate';
import { hasOpenAiKey, transcribeOpenAi } from './openai';
import { FORMATS, cancelJob, enqueueRender, getJob, isFormat } from './render';
import { ALLOWED_VIDEO_EXT, MASK_DIR, MEDIA_DIR, OUT_DIR, PROJECT_DIR, inside, isSafeId, safeMediaName } from './storage';

if (existsSync('.env')) process.loadEnvFile('.env');

const PORT = Number(process.env.PORT ?? 3210);
const HOST = '127.0.0.1';
const MAX_UPLOAD = 2 * 1024 * 1024 * 1024; // 2 GB

export const app = express();
app.disable('x-powered-by');

// Bloqueia DNS rebinding: só aceita Host local.
app.use((req, res, next) => {
  const host = (req.headers.host ?? '').replace(/:\d+$/, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return res.status(403).json({ error: 'host não permitido' });
  next();
});

// Cabeçalhos de segurança: sem embutir em iframe (clickjacking), sem sniff de tipo, sem referrer.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// CSRF: escrita exige header próprio (site de fora não consegue mandar sem preflight, que negamos).
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-editor'] !== '1') {
    return res.status(403).json({ error: 'requisição não permitida' });
  }
  next();
});

// O render (Chromium do Remotion) roda em outra porta local e precisa ler as máscaras num canvas:
// libera CORS só para origens locais.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
app.use('/media', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && LOCAL_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});
app.use('/media', express.static(MEDIA_DIR, { fallthrough: false, index: false, dotfiles: 'deny' }));

// Máscaras da pessoa: uma JPEG por quadro em data/media/masks/<idDoVídeo>/<n>.jpg
const MAX_MASK = 1024 * 1024;
const MAX_MASK_FRAMES = 30 * 60 * 60; // 1 h a 30 fps
app.delete('/api/masks/:id', async (req, res) => {
  if (!isSafeId(req.params.id)) return res.status(400).json({ error: 'id inválido' });
  await rm(inside(MASK_DIR, req.params.id), { recursive: true, force: true });
  res.json({ ok: true });
});
app.put('/api/masks/:id/:n', express.raw({ type: 'image/jpeg', limit: MAX_MASK }), async (req, res) => {
  const n = Number(req.params.n);
  if (!isSafeId(req.params.id) || !Number.isInteger(n) || n < 0 || n >= MAX_MASK_FRAMES) return res.status(400).json({ error: 'máscara inválida' });
  const body = req.body as Buffer;
  // só JPEG de verdade (assinatura FF D8 FF)
  if (!Buffer.isBuffer(body) || body.length < 4 || body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff) {
    return res.status(400).json({ error: 'máscara não é JPEG' });
  }
  const dir = inside(MASK_DIR, req.params.id);
  await mkdir(dir, { recursive: true });
  await writeFile(inside(dir, `${n}.jpg`), body);
  res.json({ ok: true });
});

app.get('/api/status', (_req, res) => {
  res.json({ openai: hasOpenAiKey(), formats: FORMATS });
});

const execFileP = promisify(execFile);

/** Normaliza vídeos HEVC 10-bit (.mov do iPhone) para H.264 yuv420p compatível com qualquer navegador no Mac. */
async function normalizeVideoIfNeeded(dest: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const { stdout } = await execFileP('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,pix_fmt',
      '-of', 'json',
      dest,
    ]);
    const info = JSON.parse(stdout) as { streams?: { codec_name?: string; pix_fmt?: string }[] };
    const st = info.streams?.[0];
    if (!st) return;
    if (st.codec_name === 'h264' && st.pix_fmt === 'yuv420p') return;
    const tmp = `${dest}.norm${path.extname(dest)}`;
    try {
      await execFileP('ffmpeg', [
        '-y', '-i', dest,
        '-map', '0:v:0', '-map', '0:a:0?',
        '-r', '30',
        '-c:v', 'h264_videotoolbox', '-pix_fmt', 'yuv420p', '-b:v', '14M',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        tmp,
      ]);
      await rename(tmp, dest);
    } catch {
      await rm(tmp, { force: true });
    }
  } catch {
    // Se não for vídeo real ou ffprobe não existir, mantém o arquivo original.
  }
}

// Upload: corpo cru do arquivo; extensão vem no header.
app.post('/api/upload', async (req, res) => {
  const ext = String(req.headers['x-file-ext'] ?? '').toLowerCase();
  if (!ALLOWED_VIDEO_EXT.has(ext)) return res.status(400).json({ error: 'formato não suportado (use mp4, mov, m4v, webm)' });
  const len = Number(req.headers['content-length'] ?? 0);
  if (len > MAX_UPLOAD) return res.status(413).json({ error: 'arquivo maior que 2 GB' });
  const name = `${newId('m')}${ext}`;
  const dest = inside(MEDIA_DIR, name);
  let received = 0;
  req.on('data', (c: Buffer) => {
    received += c.length;
    if (received > MAX_UPLOAD) req.destroy(new Error('arquivo grande demais'));
  });
  try {
    await pipeline(req, createWriteStream(dest));
    await normalizeVideoIfNeeded(dest);
    res.json({ name, url: `/media/${name}` });
  } catch {
    await rm(dest, { force: true });
    res.status(400).json({ error: 'falha no upload' });
  }
});

app.use(express.json({ limit: '20mb' }));

app.post('/api/transcribe/openai', async (req, res) => {
  const name = safeMediaName(req.body?.name);
  if (!name) return res.status(400).json({ error: 'mídia inválida' });
  try {
    const lang = typeof req.body?.lang === 'string' && /^([a-z]{2}|auto)$/.test(req.body.lang) ? req.body.lang : 'pt';
    res.json({ words: await transcribeOpenAi(name, lang) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'falha na transcrição' });
  }
});

app.post('/api/render', (req, res) => {
  const { project, format, layer = 'captions' } = req.body ?? {};
  if (!isFormat(format)) return res.status(400).json({ error: 'formato inválido' });
  if (layer !== 'captions' && layer !== 'person') return res.status(400).json({ error: 'camada inválida' });
  const v = validateProject(project);
  if (!v.ok) return res.status(400).json({ error: v.error });
  if (v.project.video.src && !safeMediaName(v.project.video.src.replace(/^\/media\//, ''))) {
    return res.status(400).json({ error: 'vídeo inválido' });
  }
  if (layer === 'person' && !v.project.video.mask) return res.status(400).json({ error: 'faça a análise de pessoa antes' });
  const job = enqueueRender(v.project, format, `http://${HOST}:${PORT}`, layer);
  res.json({ id: job.id });
});

app.get('/api/render/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'não encontrado' });
  res.json({ status: job.status, progress: job.progress, error: job.error, ready: job.status === 'done' });
});

app.delete('/api/render/:id', (req, res) => {
  const job = cancelJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'não encontrado' });
  res.json({ status: job.status });
});

app.get('/api/render/:id/download', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.file) return res.status(404).json({ error: 'não encontrado' });
  res.download(inside(OUT_DIR, job.file), `legendas-${job.file}`);
});

// Projetos salvos em disco (JSON).
app.get('/api/projects', async (_req, res) => {
  const files = (await readdir(PROJECT_DIR)).filter((f) => f.endsWith('.json'));
  const list = await Promise.all(
    files.map(async (f) => {
      try {
        const p = JSON.parse(await readFile(inside(PROJECT_DIR, f), 'utf8'));
        return { id: p.id, name: p.name };
      } catch {
        return null;
      }
    }),
  );
  res.json(list.filter(Boolean));
});

app.get('/api/projects/:id', async (req, res) => {
  if (!isSafeId(req.params.id)) return res.status(400).json({ error: 'id inválido' });
  try {
    res.type('json').send(await readFile(inside(PROJECT_DIR, `${req.params.id}.json`), 'utf8'));
  } catch {
    res.status(404).json({ error: 'não encontrado' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  if (!isSafeId(req.params.id)) return res.status(400).json({ error: 'id inválido' });
  const v = validateProject(req.body);
  if (!v.ok || v.project.id !== req.params.id) return res.status(400).json({ error: v.ok ? 'id diferente' : v.error });
  await writeFile(inside(PROJECT_DIR, `${req.params.id}.json`), JSON.stringify(v.project));
  res.json({ ok: true });
});

// Produção: serve o app compilado.
const DIST = path.resolve(process.cwd(), 'dist');
if (process.env.NODE_ENV === 'production' && existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api|media).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// Erros não mostram stack.
app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  // 4xx: mensagem genérica (não expõe caminho de arquivo); 5xx: só a 1ª linha
  res.status(status).json({ error: status === 404 ? 'não encontrado' : status < 500 ? 'requisição inválida' : (err.message?.split('\n')[0] ?? 'erro') });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`Editor de legendas: http://localhost:${process.env.NODE_ENV === 'production' ? PORT : 5173}`);
  });
}
