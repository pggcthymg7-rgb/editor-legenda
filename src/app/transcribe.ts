// Transcrição no aparelho (offline, grátis): Whisper com tempo por palavra via transformers.js.
// - Chrome/Mac: WebGPU (rápido). Safari/iPhone: CPU (WASM) — o transformers.js carrega no Safari
//   o runtime ONNX sem WebGPU, então forçar WebGPU lá quebra ("webgpuInit is not a function").
// - Se o WebGPU falhar em qualquer navegador, cai sozinho para CPU.
// - O áudio é decodificado em pedaços pelo mediabunny (não estoura a memória com MOV grande).
import { fromRemotionCaptions } from '../core/transcript';
import type { TranscribedWord } from '../core/types';
import { decodeAudio16k } from './platform/audio';

export type LocalModel = 'base' | 'small' | 'medium' | 'large-v3-turbo';
/** idioma falado no vídeo; 'auto' = o Whisper detecta */
export type Lang = 'pt' | 'en' | 'es' | 'auto';

export const MODEL_IDS: Record<LocalModel, string> = {
  base: 'onnx-community/whisper-base_timestamped',
  small: 'onnx-community/whisper-small_timestamped',
  medium: 'onnx-community/whisper-medium_timestamped',
  'large-v3-turbo': 'onnx-community/whisper-large-v3-turbo_timestamped',
};
const LANG_NAME: Record<Exclude<Lang, 'auto'>, string> = { pt: 'portuguese', en: 'english', es: 'spanish' };

export type Device = 'webgpu' | 'wasm';

/** CPU: encoder q8 + decoder q4 (o decoder q8 "merged" quebra no ONNX Runtime 1.26). */
export const WASM_DTYPE = { encoder_model: 'q8', decoder_model_merged: 'q4' } as const;

/** Safari (inclui todo navegador do iPhone, que usa WebKit). */
export function isSafariLike(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|Edg\/|Android/.test(ua);
}

/** Ordem de tentativa dos motores. */
export async function devicesToTry(): Promise<Device[]> {
  if (isSafariLike()) return ['wasm'];
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu && (await gpu.requestAdapter())) return ['webgpu', 'wasm'];
  } catch {
    // sem WebGPU
  }
  return ['wasm'];
}

type Chunk = { text: string; timestamp: [number, number | null] };

/** Saída do pipeline (chunks por palavra) → palavras com tempo em ms. */
export function chunksToWords(chunks: Chunk[], durationS: number): TranscribedWord[] {
  const caps = chunks
    .filter((c) => c && typeof c.text === 'string' && c.text.trim())
    .map((c) => {
      const start = Math.max(0, c.timestamp[0] ?? 0);
      const end = c.timestamp[1] ?? Math.min(durationS, start + 0.4);
      return { text: c.text, startMs: Math.round(start * 1000), endMs: Math.round(Math.max(end, start + 0.04) * 1000) };
    });
  return fromRemotionCaptions(caps);
}

export async function transcribeLocal(
  file: Blob,
  model: LocalModel,
  onStatus: (msg: string, progress?: number) => void,
  lang: Lang = 'pt',
): Promise<TranscribedWord[]> {
  onStatus('Lendo o áudio…', 0);
  const audio = await decodeAudio16k(file, (p) => onStatus('Lendo o áudio…', p));
  if (audio.length < 1600) throw new Error('Não achei áudio neste vídeo.');

  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  env.useBrowserCache = true; // modelo fica guardado: só baixa na 1ª vez

  const devices = await devicesToTry();
  let lastErr: unknown = null;
  type AsrOut = { chunks?: Chunk[] };
  type AsrRunner = ((audio: Float32Array, opts: Record<string, unknown>) => Promise<AsrOut | AsrOut[]>) & {
    dispose?: () => Promise<void>;
  };
  for (const device of devices) {
    let asr: AsrRunner | null = null;
    try {
      const loaded = new Map<string, [number, number]>();
      onStatus('Baixando o modelo de fala (só na primeira vez)…', 0);
      asr = (await pipeline('automatic-speech-recognition', MODEL_IDS[model], {
        device,
        // WebGPU: encoder fp32 + decoder q4 (qualidade/velocidade); CPU: tudo q8 (leve)
        dtype: device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : WASM_DTYPE,
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status !== 'progress' || !p.file || !p.total) return;
          loaded.set(p.file, [p.loaded ?? 0, p.total]);
          let a = 0;
          let t = 0;
          for (const [l, tt] of loaded.values()) {
            a += l;
            t += tt;
          }
          onStatus('Baixando o modelo de fala (só na primeira vez)…', t ? a / t : undefined);
        },
      })) as AsrRunner;
      const durationS = audio.length / 16000;
      onStatus(
        device === 'webgpu'
          ? 'Transcrevendo com a GPU…'
          : `Transcrevendo no processador… (cerca de ${Math.max(1, Math.round(durationS / 60))}–${Math.max(2, Math.round((durationS / 60) * 3))} min; deixe o app aberto)`,
      );
      const out = await asr(audio, {
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
        task: 'transcribe',
        ...(lang === 'auto' ? {} : { language: LANG_NAME[lang] }),
      });
      const res = Array.isArray(out) ? out[0] : out;
      const words = chunksToWords((res?.chunks ?? []) as Chunk[], durationS);
      if (!words.length) throw new Error('Não ouvi fala neste vídeo.');
      return words;
    } catch (e) {
      lastErr = e;
      if ((e as Error)?.message === 'Não ouvi fala neste vídeo.') throw e;
      if (device === 'webgpu') onStatus('A GPU falhou; tentando no processador…');
    } finally {
      await asr?.dispose?.().catch?.(() => undefined);
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(/fetch|load|network/i.test(msg) ? `Não consegui baixar o modelo de fala (${msg}). Confira a internet.` : `A IA local falhou: ${msg}`);
}
