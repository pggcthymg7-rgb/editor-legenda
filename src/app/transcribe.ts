// Transcrição no aparelho (offline, grátis): Whisper em WebGPU (Chrome no Mac, Safari 26+ no iPhone).
// O áudio é decodificado em pedaços pelo mediabunny (não estoura a memória do iPhone com MOV grande).
import { canUseWhisperWebGpu, downloadWhisperModel, toCaptions, transcribe } from '@remotion/whisper-webgpu';
import { fromRemotionCaptions } from '../core/transcript';
import type { TranscribedWord } from '../core/types';
import { decodeAudio16k } from './platform/audio';

export type LocalModel = 'base' | 'small' | 'medium' | 'large-v3-turbo';
/** idioma falado no vídeo; 'auto' = o Whisper detecta */
export type Lang = 'pt' | 'en' | 'es' | 'auto';

export async function transcribeLocal(
  file: Blob,
  model: LocalModel,
  onStatus: (msg: string, progress?: number) => void,
  lang: Lang = 'pt',
): Promise<TranscribedWord[]> {
  const support = await canUseWhisperWebGpu();
  if (!support.supported) {
    throw new Error(`Este aparelho não tem WebGPU para a IA local (${support.detailedReason || 'atualize o iOS/navegador'}). Use “Nuvem”.`);
  }
  onStatus('Baixando o modelo de fala (só na primeira vez)…', 0);
  try {
    await downloadWhisperModel({
      model,
      onProgress: (p) => onStatus('Baixando o modelo de fala (só na primeira vez)…', p.totalBytes ? p.loadedBytes / p.totalBytes : undefined),
    });
  } catch (e) {
    throw new Error(`Não consegui baixar o modelo (${(e as Error).message}). Confira a internet ou use “Nuvem”.`);
  }
  onStatus('Lendo o áudio…', 0);
  const channelWaveform = await decodeAudio16k(file, (p) => onStatus('Lendo o áudio…', p));
  onStatus('Transcrevendo no aparelho… (cerca de 1 a 3 min por minuto de vídeo; deixe o app aberto)');
  const out = await transcribe({ channelWaveform, model, language: lang === 'auto' ? undefined : lang });
  const { captions } = toCaptions({ whisperWebGpuOutput: out });
  return fromRemotionCaptions(captions);
}
