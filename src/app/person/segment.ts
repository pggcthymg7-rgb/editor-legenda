// Análise de pessoa no navegador (Mac e iPhone): MediaPipe Image Segmenter (selfie multiclass)
// quadro a quadro, decodificando o vídeo com o mediabunny. Gera uma máscara JPEG por quadro (branco = pessoa).
import { MASK_FPS, MASK_WIDTH, fillHoles, maskFrameCount, refineMask, removeSmallIslands } from '../../core/mask';

export type MaskResult = { frames: Blob[]; width: number; height: number; fps: number };

const base = () => (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');

function softwareGpu(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software/i.test(r);
  } catch {
    return true;
  }
}

async function createSegmenter() {
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(`${base()}mediapipe`);
  const opts = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${base()}models/selfie_multiclass_256x256.tflite`, delegate },
    runningMode: 'VIDEO' as const,
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
  // GPU por software (sem placa de vídeo) é mais lento que a CPU: usa CPU direto
  if (softwareGpu()) return ImageSegmenter.createFromOptions(fileset, opts('CPU'));
  try {
    return await ImageSegmenter.createFromOptions(fileset, opts('GPU'));
  } catch {
    // sem WebGL2/GPU: CPU (mais lento, mesmo resultado)
    return ImageSegmenter.createFromOptions(fileset, opts('CPU'));
  }
}

export async function analyzePerson(
  videoUrl: string,
  durationMs: number,
  onProgress: (p: number, msg: string) => void,
  signal?: AbortSignal,
): Promise<MaskResult> {
  onProgress(0, 'Carregando modelo de pessoa…');
  const [{ ALL_FORMATS, CanvasSink, Input, UrlSource }, segmenter] = await Promise.all([import('mediabunny'), createSegmenter()]);
  const input = new Input({ source: new UrlSource(videoUrl), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('Vídeo sem imagem');
    const w = MASK_WIDTH;
    const h = Math.round((MASK_WIDTH * track.displayHeight) / track.displayWidth / 2) * 2;
    const sink = new CanvasSink(track, { width: w, height: h, fit: 'fill' });
    const count = maskFrameCount(durationMs);
    const first = await track.getFirstTimestamp();
    const times = Array.from({ length: count }, (_, i) => first + i / MASK_FPS);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d')!;
    const img = octx.createImageData(w, h);
    const gray = new Uint8ClampedArray(w * h);
    let prev: Float32Array | null = null;
    const frames: Blob[] = [];
    let i = 0;
    onProgress(0, 'Analisando a pessoa quadro a quadro…');
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (signal?.aborted) throw new Error('cancelado');
      if (wrapped) {
        const res = // MediaPipe exige tempo ≥ 0 e crescente; MOV com B-frames pode começar negativo
        segmenter.segmentForVideo(wrapped.canvas as HTMLCanvasElement, Math.round((i * 1000) / MASK_FPS) + 1);
        const masks = res.confidenceMasks ?? [];
        // classe 0 = fundo → pessoa = 1 - fundo
        const bg = masks[0]?.getAsFloat32Array();
        if (bg && bg.length === w * h) {
          const person = new Float32Array(bg.length);
          for (let j = 0; j < bg.length; j++) person[j] = 1 - bg[j];
          prev = refineMask(person, prev, gray);
          removeSmallIslands(gray, w, h);
          fillHoles(gray, w, h);
        }
        masks.forEach((m) => m.close());
      }
      // sem quadro decodificado: repete a última máscara
      for (let j = 0, k = 0; j < gray.length; j++, k += 4) {
        img.data[k] = img.data[k + 1] = img.data[k + 2] = gray[j];
        img.data[k + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      frames.push(await new Promise<Blob>((r, rej) => out.toBlob((b) => (b ? r(b) : rej(new Error('falha ao gerar máscara'))), 'image/jpeg', 0.9)));
      i++;
      if (i % 5 === 0) onProgress(i / count, `Analisando a pessoa… ${i}/${count}`);
    }
    if (!frames.length || !prev) throw new Error('Não deu para ler os quadros do vídeo');
    while (frames.length < count) frames.push(frames[frames.length - 1]);
    onProgress(1, 'Pronto');
    return { frames, width: w, height: h, fps: MASK_FPS };
  } finally {
    segmenter.close();
    input.dispose();
  }
}
