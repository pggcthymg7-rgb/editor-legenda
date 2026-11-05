// Transcrição via API OpenAI (opcional). A chave fica só no servidor (.env), nunca no navegador.
import { execFile } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fromOpenAi } from '../src/core/transcript';
import type { TranscribedWord } from '../src/core/types';
import { MEDIA_DIR, inside } from './storage';

const run = promisify(execFile);
const REMOTION_BIN = path.resolve(process.cwd(), 'node_modules/.bin/remotion');
const MAX_BYTES = 25 * 1024 * 1024; // limite da API

export const hasOpenAiKey = () => Boolean(process.env.OPENAI_API_KEY);

/** Extrai áudio mono 16 kHz MP3 com o ffmpeg que vem com o Remotion. */
async function extractAudio(mediaName: string): Promise<string> {
  const input = inside(MEDIA_DIR, mediaName);
  const out = inside(MEDIA_DIR, `${path.parse(mediaName).name}.audio.mp3`);
  await run(REMOTION_BIN, ['ffmpeg', '-y', '-v', 'error', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', out]);
  return out;
}

export async function transcribeOpenAi(mediaName: string, language = 'pt'): Promise<TranscribedWord[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY não configurada no .env');
  const audioPath = await extractAudio(mediaName);
  try {
    const buf = await readFile(audioPath);
    if (buf.byteLength > MAX_BYTES) throw new Error('Áudio maior que 25 MB (cerca de 100 min). Corte o vídeo.');
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', 'whisper-1');
    if (language !== 'auto') form.append('language', language);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      // não repassa corpo cru (pode ecoar dados da conta)
      throw new Error(`OpenAI respondeu ${res.status}`);
    }
    return fromOpenAi(await res.json());
  } finally {
    await rm(audioPath, { force: true });
  }
}
