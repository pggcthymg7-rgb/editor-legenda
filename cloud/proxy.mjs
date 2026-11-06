// Proxy de transcrição na nuvem (Render, plano grátis). Sem dependências: só Node 22.
// O app (PWA) manda o áudio já extraído (m4a mono, ~0,25 MB/min); aqui repassamos ao Groq
// (whisper-large-v3-turbo, grátis e muito rápido) com a chave guardada SÓ no servidor.
// Variáveis: GROQ_API_KEY (recomendado) ou OPENAI_API_KEY; ALLOWED_ORIGINS (vírgulas); PORT.
import crypto from 'node:crypto';
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
const LANGS = /^([a-z]{2}|auto)$/;
// Frase-exemplo pontuada: faz o Whisper devolver maiúsculas e pontuação (sem ela às vezes vem tudo minúsculo)
const PROMPTS = {
  pt: 'Olá, tudo bem? Hoje eu vou te mostrar como funciona. Vamos lá!',
  en: "Hello, how are you? Today I'll show you how it works. Let's go!",
  es: 'Hola, ¿qué tal? Hoy te voy a mostrar cómo funciona. ¡Vamos!',
};

const GROQ_KEY = /^gsk_[A-Za-z0-9]{20,200}$/;

/** Provedor ativo: chave do usuário (BYOK) tem precedência sobre chaves do servidor. */
export function provider(env = process.env, userKey) {
  if (typeof userKey === 'string' && GROQ_KEY.test(userKey)) {
    return { name: 'groq', url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo', key: userKey };
  }
  if (env.GROQ_API_KEY) return { name: 'groq', url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo', key: env.GROQ_API_KEY };
  if (env.OPENAI_API_KEY) return { name: 'openai', url: 'https://api.openai.com/v1/audio/transcriptions', model: 'whisper-1', key: env.OPENAI_API_KEY };
  return null;
}

// Limites Groq (plano gratuito Whisper) com margem preventiva de 90%:
// 18 req/min (teto oficial 20), 1.800 req/dia (2.000), 6.480 s/h (7.200s), 25.920 s/dia (28.800s).
// Configuráveis via env. A chave NUNCA é guardada/logada: usamos apenas seu hash SHA-256.
const LIMIT_REQ_MIN = Number(process.env.LIMIT_REQ_MIN ?? 18);
const LIMIT_REQ_DAY = Number(process.env.LIMIT_REQ_DAY ?? 1800);
const LIMIT_SEC_HOUR = Number(process.env.LIMIT_SEC_HOUR ?? 6480);
const LIMIT_SEC_DAY = Number(process.env.LIMIT_SEC_DAY ?? 25920);

export function keyHash(key) {
  if (typeof key !== 'string' || !key) return 'anonymous';
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

// Histórico em memória por hash de chave: array de { t: number, s: number }
const KEY_USAGE = new Map();
const MAX_TRACKED_KEYS = 2000;

export function checkKeyQuota(hash, audioSec = 60, now = Date.now()) {
  const usage = (KEY_USAGE.get(hash) ?? []).filter((item) => now - item.t < 86400_000);
  KEY_USAGE.delete(hash); // atualiza para o fim do Map

  let reqMin = 0;
  let secHour = 0;
  let secDay = 0;
  const reqDay = usage.length;

  for (const item of usage) {
    if (now - item.t < 60_000) reqMin++;
    if (now - item.t < 3600_000) secHour += item.s;
    secDay += item.s;
  }

  if (reqMin >= LIMIT_REQ_MIN) {
    KEY_USAGE.set(hash, usage);
    return { ok: false, error: 'Limite por minuto atingido (máx 18 req/min). Aguarde 1 minuto.', retryAfter: 60 };
  }
  if (secHour + audioSec > LIMIT_SEC_HOUR) {
    KEY_USAGE.set(hash, usage);
    const oldestInHour = usage.find((item) => now - item.t < 3600_000);
    const retryAfter = oldestInHour ? Math.max(1, Math.ceil((3600_000 - (now - oldestInHour.t)) / 1000)) : 3600;
    return { ok: false, error: 'Limite de áudio por hora atingido (máx 108 min/hora). Tente mais tarde.', retryAfter };
  }
  if (reqDay >= LIMIT_REQ_DAY) {
    KEY_USAGE.set(hash, usage);
    return { ok: false, error: 'Limite diário de requisições atingido (máx 1.800 req/dia).', retryAfter: 86400 };
  }
  if (secDay + audioSec > LIMIT_SEC_DAY) {
    KEY_USAGE.set(hash, usage);
    return { ok: false, error: 'Limite diário de áudio atingido (máx 7,2 horas/dia).', retryAfter: 86400 };
  }

  usage.push({ t: now, s: audioSec });
  KEY_USAGE.set(hash, usage);
  while (KEY_USAGE.size > MAX_TRACKED_KEYS) KEY_USAGE.delete(KEY_USAGE.keys().next().value);
  return { ok: true };
}

// limite por IP: protege a cota grátis contra abuso (janela de 1 h)
const HITS = new Map();
const LIMIT_PER_HOUR = Number(process.env.LIMIT_PER_HOUR ?? 60);
const MAX_IPS = 5000;

/**
 * IP do cliente no Render.
 * Arquitetura de proxy reverso do Render: o load balancer do Render ACRESCENTA obrigatoriamente
 * o IP real de quem conectou no FINAL da cadeia do cabeçalho x-forwarded-for. O início do cabeçalho
 * é enviado pelo cliente e pode ser arbitrariamente forjado; portanto, pop() (o último elemento)
 * é a única fonte segura e confiável de IP sob a infraestrutura do Render.
 */
export function clientIp(xff, remote) {
  const last = String(xff ?? '').split(',').map((s) => s.trim()).filter(Boolean).pop();
  return (last ?? String(remote ?? '')).slice(0, 64);
}
export function allow(ip, now = Date.now()) {
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < 3600_000);
  HITS.delete(ip); // reinsere no fim: ordem do Map = mais antigo primeiro
  if (arr.length >= LIMIT_PER_HOUR) {
    HITS.set(ip, arr);
    return false;
  }
  arr.push(now);
  HITS.set(ip, arr);
  // estourou: tira só o IP mais antigo (Map guarda ordem de inserção), sem zerar o limite de todos
  while (HITS.size > MAX_IPS) HITS.delete(HITS.keys().next().value);
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

function send(res, status, body, origin, extraHeaders = {}) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
    ...extraHeaders,
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
        'access-control-allow-headers': 'content-type, x-app, x-groq-key, x-audio-seconds',
        'access-control-max-age': '86400',
        vary: 'Origin',
      });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      const p = provider();
      return send(res, 200, { ok: true, ready: Boolean(p) }, origin);
    }
    if (req.method === 'POST' && url.pathname === '/transcribe') {
      // navegador: só do app; header próprio força preflight (CSRF de outro site não passa)
      if (origin && !ORIGINS.has(origin)) return send(res, 403, { error: 'origem não permitida' });
      if (req.headers['x-app'] !== 'legendas') return send(res, 403, { error: 'cliente não permitido' });
      const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!AUDIO_TYPES.has(type)) return send(res, 415, { error: 'formato de áudio não suportado' }, origin);
      const ip = clientIp(req.headers['x-forwarded-for'], req.socket.remoteAddress);
      if (!allow(ip)) return send(res, 429, { error: 'muitas transcrições nesta hora; tente mais tarde' }, origin, { 'retry-after': '3600' });
      const userKey = req.headers['x-groq-key'];
      const p = provider(process.env, userKey);
      if (!p) return send(res, 503, { error: 'servidor sem chave configurada' }, origin);

      const parsedSec = Number(req.headers['x-audio-seconds']);
      const audioSec = Number.isFinite(parsedSec) && parsedSec > 0 && parsedSec <= 3600 ? Math.round(parsedSec) : 60;
      const quota = checkKeyQuota(keyHash(p.key), audioSec);
      if (!quota.ok) {
        return send(res, 429, { error: quota.error }, origin, { 'retry-after': String(quota.retryAfter ?? 60) });
      }

      const lang = url.searchParams.get('lang') ?? 'pt';
      if (!LANGS.test(lang)) return send(res, 400, { error: 'idioma inválido' }, origin);
      const audio = await readBody(req);
      if (audio.length < 100) return send(res, 400, { error: 'áudio vazio' }, origin);
      const form = new FormData();
      const ext = type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : type.includes('webm') ? 'webm' : type.includes('ogg') ? 'ogg' : type.includes('flac') ? 'flac' : 'm4a';
      form.append('file', new Blob([audio], { type }), `audio.${ext}`);
      form.append('model', p.model);
      if (lang !== 'auto') form.append('language', lang);
      form.append('response_format', 'verbose_json');
      form.append('timestamp_granularities[]', 'word');
      form.append('temperature', '0');
      form.append('prompt', PROMPTS[lang] ?? PROMPTS.en);
      const r = await fetch(p.url, {
        method: 'POST',
        headers: { authorization: `Bearer ${p.key}` },
        body: form,
        signal: AbortSignal.timeout(180_000),
      });

      if (!r.ok) {
        if (r.status === 429) {
          const retrySec = Number(r.headers.get('retry-after')) || 60;
          return send(
            res,
            429,
            { error: 'Limite do provedor Groq atingido para esta chave. Tente novamente em instantes.' },
            origin,
            { 'retry-after': String(retrySec) },
          );
        }
        return send(res, 502, { error: `transcrição falhou (${p.name} ${r.status})` }, origin);
      }
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
