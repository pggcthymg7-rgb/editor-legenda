// Transcrição na nuvem (proxy grátis no Render → Groq whisper-large-v3-turbo).
// A chave do provedor fica só no servidor; o app não precisa de chave nenhuma.
import { fromOpenAi } from '../core/transcript';
import type { TranscribedWord } from '../core/types';

export const CLOUD_URL = (import.meta.env.VITE_CLOUD_URL ?? 'https://editor-legenda-api.onrender.com').replace(/\/$/, '');

export type CloudState = 'checking' | 'ready' | 'nokey' | 'offline';

// Chave grátis do Groq do próprio usuário (opcional): guardada só neste aparelho, colada uma vez.
const KEY = 'editor-legenda.groq-key';
export const isGroqKey = (k: string) => /^gsk_[A-Za-z0-9]{20,200}$/.test(k.trim());
export function getGroqKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function setGroqKey(k: string | null) {
  try {
    if (k) localStorage.setItem(KEY, k.trim());
    else localStorage.removeItem(KEY);
  } catch {
    throw new Error('Não consegui guardar a chave neste aparelho');
  }
  healthPromise = null;
}

let healthPromise: Promise<CloudState> | null = null;

/** Verifica (e acorda) o servidor. O plano grátis dorme: a 1ª chamada pode levar ~30–60 s. */
export function cloudHealth(fetchImpl: typeof fetch = fetch): Promise<CloudState> {
  healthPromise ??= (async () => {
    let state: CloudState = 'offline';
    try {
      await Promise.resolve();
      const r = await fetchImpl(`${CLOUD_URL}/health`, { signal: AbortSignal.timeout(75_000) });
      if (!r.ok) return 'offline';
      const j = (await r.json()) as { ready?: boolean };
      state = j.ready || getGroqKey() ? 'ready' : 'nokey';
      return state;
    } catch {
      return 'offline';
    } finally {
      // se deu offline, libera na hora para tentar de novo; se respondeu, guarda por 60 s
      if (state === 'offline') healthPromise = null;
      else setTimeout(() => (healthPromise = null), 60_000);
    }
  })();
  return healthPromise;
}

export async function cloudTranscribe(audio: Blob, lang = 'pt', fetchImpl: typeof fetch = fetch): Promise<TranscribedWord[]> {
  if (audio.size > 25 * 1024 * 1024) throw new Error('Áudio maior que 25 MB (cerca de 100 min). Corte o vídeo.');
  let r: Response;
  try {
    r = await fetchImpl(`${CLOUD_URL}/transcribe?lang=${encodeURIComponent(lang)}`, {
      method: 'POST',
      headers: { 'content-type': 'audio/mp4', 'x-app': 'legendas', ...(getGroqKey() ? { 'x-groq-key': getGroqKey()! } : {}) },
      body: audio,
      signal: AbortSignal.timeout(240_000),
    });
  } catch {
    throw new Error('Sem conexão com a nuvem. Tente de novo ou use “No aparelho”.');
  }
  const body = (await r.json().catch(() => ({}))) as { error?: string; words?: unknown; text?: string };
  if (!r.ok) throw new Error(body.error ?? `Nuvem respondeu ${r.status}`);
  const words = fromOpenAi(body as Parameters<typeof fromOpenAi>[0]);
  if (!words.length) throw new Error('Não ouvi fala neste vídeo.');
  return words;
}
