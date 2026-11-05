// Áudio do vídeo, decodificado em pedaços pelo mediabunny (WebCodecs): não carrega o vídeo
// inteiro na memória — essencial no iPhone, onde um MOV 4K de 1 min passa de 400 MB.
import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, UrlSource, WavOutputFormat, canEncodeAudio } from 'mediabunny';

type Src = Blob | string;
const inputOf = (src: Src) => new Input({ source: typeof src === 'string' ? new UrlSource(src) : new BlobSource(src), formats: ALL_FORMATS });

/** Áudio compacto (AAC mono 16 kHz 32 kbps, ~0,25 MB/min) para enviar à nuvem. */
export async function extractAudio(src: Src, onProgress?: (p: number) => void): Promise<Blob> {
  if (!(await canEncodeAudio('aac'))) {
    // Safari sem encoder AAC nativo: usa o encoder em WebAssembly
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
  }
  const input = inputOf(src);
  try {
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      audio: { codec: 'aac', numberOfChannels: 1, sampleRate: 16000, bitrate: 32000, forceTranscode: true },
    });
    if (!conversion.isValid) throw new Error('Não achei áudio neste vídeo');
    if (onProgress) conversion.onProgress = onProgress;
    await conversion.execute();
    if (!target.buffer) throw new Error('Falha ao extrair o áudio');
    return new Blob([target.buffer], { type: 'audio/mp4' });
  } finally {
    input.dispose();
  }
}

/** PCM mono 16 kHz (Float32) para o Whisper no aparelho. */
export async function decodeAudio16k(src: Src, onProgress?: (p: number) => void): Promise<Float32Array> {
  const input = inputOf(src);
  try {
    const target = new BufferTarget();
    const output = new Output({ format: new WavOutputFormat(), target });
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      audio: { codec: 'pcm-f32', numberOfChannels: 1, sampleRate: 16000, forceTranscode: true },
    });
    if (!conversion.isValid) throw new Error('Não achei áudio neste vídeo');
    if (onProgress) conversion.onProgress = onProgress;
    await conversion.execute();
    if (!target.buffer) throw new Error('Falha ao ler o áudio');
    return wavToFloat32(target.buffer);
  } finally {
    input.dispose();
  }
}

/** Lê o bloco "data" de um WAV float32. */
export function wavToFloat32(buf: ArrayBuffer): Float32Array {
  const v = new DataView(buf);
  let off = 12;
  while (off + 8 <= v.byteLength) {
    const id = String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
    const size = v.getUint32(off + 4, true);
    if (id === 'data') {
      const len = Math.min(size, v.byteLength - off - 8);
      return new Float32Array(buf.slice(off + 8, off + 8 + len - (len % 4)));
    }
    off += 8 + size + (size % 2);
  }
  throw new Error('WAV sem dados');
}
