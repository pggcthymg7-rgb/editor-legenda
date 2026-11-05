// Transcrição OpenAI direto do aparelho, com a chave do próprio usuário (guardada só no aparelho).
import { fromOpenAi } from '../../core/transcript';
import type { TranscribedWord } from '../../core/types';

export const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // limite da API
const KEY_STORAGE = 'editor-legenda.openai-key';

export const isPlausibleKey = (k: string) => /^sk-[A-Za-z0-9_-]{20,300}$/.test(k.trim());

export function getKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}
export function setKey(k: string | null) {
  try {
    if (k) localStorage.setItem(KEY_STORAGE, k.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    throw new Error('Não consegui guardar a chave neste aparelho');
  }
}

export function buildTranscriptionForm(audio: Blob, filename: string, language = 'pt'): FormData {
  const form = new FormData();
  form.append('file', audio, filename);
  form.append('model', 'whisper-1');
  form.append('language', language);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  return form;
}

export async function transcribeWithKey(
  key: string,
  audio: Blob,
  filename: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TranscribedWord[]> {
  if (audio.size > MAX_AUDIO_BYTES) throw new Error('Áudio maior que 25 MB. Corte o vídeo.');
  const res = await fetchImpl(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: buildTranscriptionForm(audio, filename),
  });
  // nunca repassa corpo cru nem a chave na mensagem de erro
  if (res.status === 401) throw new Error('Chave da OpenAI recusada (401). Confira a chave.');
  if (!res.ok) throw new Error(`OpenAI respondeu ${res.status}`);
  return fromOpenAi(await res.json());
}
