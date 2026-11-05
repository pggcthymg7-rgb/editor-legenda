// Tira só o áudio do vídeo (mono, 16 kHz, AAC 32 kbps) no próprio aparelho.
// Vídeo do iPhone passa fácil de 25 MB; o áudio assim fica ~0,25 MB por minuto.
import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, canEncodeAudio } from 'mediabunny';

export async function extractAudio(video: Blob): Promise<Blob> {
  if (!(await canEncodeAudio('aac'))) {
    // Safari sem encoder AAC nativo: usa o encoder em WebAssembly
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
  }
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const conversion = await Conversion.init({
    input,
    output,
    video: { discard: true },
    audio: { codec: 'aac', numberOfChannels: 1, sampleRate: 16000, bitrate: 32000, forceTranscode: true },
  });
  if (!conversion.isValid) throw new Error('Não achei áudio neste vídeo');
  await conversion.execute();
  if (!target.buffer) throw new Error('Falha ao extrair o áudio');
  return new Blob([target.buffer], { type: 'audio/mp4' });
}
