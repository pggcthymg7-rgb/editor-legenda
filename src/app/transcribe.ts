// Transcrição local no navegador (WebGPU). No Mac com Chrome usa a GPU do chip Apple.
import { canUseWhisperWebGpu, downloadWhisperModel, resampleTo16Khz, toCaptions, transcribe } from '@remotion/whisper-webgpu';
import { fromRemotionCaptions } from '../core/transcript';
import type { TranscribedWord } from '../core/types';

export type LocalModel = 'small' | 'medium' | 'large-v3-turbo';

export async function transcribeLocal(
  file: File,
  model: LocalModel,
  onStatus: (msg: string, progress?: number) => void,
): Promise<TranscribedWord[]> {
  const support = await canUseWhisperWebGpu();
  if (!support.supported) throw new Error(`WebGPU indisponível: ${support.detailedReason || 'use Chrome atualizado'}`);
  onStatus('Baixando modelo (só na primeira vez)…', 0);
  await downloadWhisperModel({
    model,
    onProgress: (p) => onStatus('Baixando modelo (só na primeira vez)…', p.totalBytes ? p.loadedBytes / p.totalBytes : undefined),
  });
  onStatus('Lendo áudio…');
  const channelWaveform = await resampleTo16Khz({ file });
  onStatus('Transcrevendo…');
  const out = await transcribe({ channelWaveform, model, language: 'pt' });
  const { captions } = toCaptions({ whisperWebGpuOutput: out });
  return fromRemotionCaptions(captions);
}
