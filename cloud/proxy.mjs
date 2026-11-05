// Proxy de transcrição na nuvem (Render, plano grátis). Sem dependências: só Node 22.
// O app (PWA) manda o áudio já extraído (m4a mono, ~0,25 MB/min); aqui repassamos ao Groq
// (whisper-large-v3-turbo, grátis e muito rápido) com a chave guardada SÓ no servidor.
// Variáveis: GROQ_API_KEY (recomendado) ou OPENAI_API_KEY; ALLOWED_ORIGINS (vírgulas); PORT.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BYTES = 25 * 1024 * 1024; // limite do Groq (plano grátis) e da OpenAI
const ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? 'https://editor-legenda.onrender.com,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://127.0.0.1:4174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
const AUDIO_TYPES = new Set(['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac']);
const LANGS = /^[a-z]{2}$/;

/** Provedor ativo: Groq (grátis) > OpenAI. */
export function provider(env = process.env) {
  if (env.GROQ_API_KEY) return { name: 'groq', url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo', key: env.GROQ_API_KEY };
  if (env.OPENAI_API_KEY) return { name: 'openai', url: 'https://api.openai.com/v1/audio/transcriptions', model: 'whisper-1', key: env.OPENAI_API_KEY };
  return null;
}

// limite por IP: protege a cota grátis contra abuso (janela de 1 h)
const HITS = new Map();
const LIMIT_PER_HOUR = Number(process.env.LIMIT_PER_HOUR ?? 60);
export function allow(ip, now = Date.now()) {
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (arr.length >= LIMIT_PER_HOUR) {
    HITS.set(ip, arr);
    return false;
  }
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear();
  return true;
}

/** Só devolve o que o app precisa (palavras e texto). */
export function slim(json) {
  const words = Array.isArray(json?.words)
    ? json.words
        .filter((w) => w && typeof w.word === 'string' && Number.isFinite(w.start) && Number.isFinite(w.end))
        .map((w) => ({ word: String(w.word).slice(0, 200), start: w.start, end: w.end }))
    : [];
  return { text: typeof json?.text === 'string' ? json.text.slice(0, 200_000) : '', words };
}

function send(res, status, body, origin) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  };
  if (origin && ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BYTES) throw Object.assign(new Error('áudio maior que 25 MB'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

export const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url ?? '/', 'http://x');
  try {
    if (req.method === 'OPTIONS') {
      if (!origin || !ORIGINS.has(origin)) return send(res, 403, { error: 'origem não permitida' });
      res.writeHead(204, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, GET',
        'access-control-allow-headers': 'content-type, x-app',
        'access-control-max-age': '86400',
        vary: 'Origin',
      });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      const p = provider();
      return send(res, 200, { ok: true, ready: Boolean(p), provider: p?.name ?? null }, origin);
    }
    if (req.method === 'POST' && url.pathname === '/transcribe') {
      // navegador: só do app; header próprio força preflight (CSRF de outro site não passa)
      if (origin && !ORIGINS.has(origin)) return send(res, 403, { error: 'origem não permitida' });
      if (req.headers['x-app'] !== 'legendas') return send(res, 403, { error: 'cliente não permitido' });
      const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!AUDIO_TYPES.has(type)) return send(res, 415, { error: 'formato de áudio não suportado' }, origin);
      const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
      if (!allow(ip)) return send(res, 429, { error: 'muitas transcrições nesta hora; tente mais tarde' }, origin);
      const p = provider();
      if (!p) return send(res, 503, { error: 'servidor sem chave configurada' }, origin);
      const lang = url.searchParams.get('lang') ?? 'pt';
      if (!LANGS.test(lang)) return send(res, 400, { error: 'idioma inválido' }, origin);
      const audio = await readBody(req);
      if (audio.length < 100) return send(res, 400, { error: 'áudio vazio' }, origin);
      const form = new FormData();
      const ext = type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : type.includes('webm') ? 'webm' : type.includes('ogg') ? 'ogg' : type.includes('flac') ? 'flac' : 'm4a';
      form.append('file', new Blob([audio], { type }), `audio.${ext}`);
      form.append('model', p.model);
      form.append('language', lang);
      form.append('response_format', 'verbose_json');
      form.append('timestamp_granularities[]', 'word');
      form.append('temperature', '0');
      const r = await fetch(p.url, {
        method: 'POST',
        headers: { authorization: `Bearer ${p.key}` },
        body: form,
        signal: AbortSignal.timeout(180_000),
      });
      // nunca repassa o corpo de erro do provedor (pode ecoar dados da conta)
      if (!r.ok) return send(res, 502, { error: `transcrição falhou (${p.name} ${r.status})` }, origin);
      return send(res, 200, slim(await r.json()), origin);
    }
    send(res, 404, { error: 'não encontrado' }, origin);
  } catch (e) {
    const status = e?.status ?? 500;
    send(res, status, { error: status === 500 ? 'erro interno' : e.message }, origin);
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => console.log(`proxy de transcrição na porta ${PORT} (provedor: ${provider()?.name ?? 'nenhum'})`));
}
