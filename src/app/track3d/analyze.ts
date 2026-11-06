// "Analisar câmera": decodifica o vídeo (mediabunny) em tons de cinza na resolução de análise
// e envia os quadros ao Web Worker, que rastreia pontos e reconstrói a câmera 3D.
import { TRACK_FPS, TRACK_SHORT } from '../../tracking3d/pipeline';
import type { Track3D } from '../../tracking3d/model';
import type { WorkerIn, WorkerOut } from '../../tracking3d/worker';

export type AnalyzeStats = { frames: number; ms: number; solveMs: number };

export async function analyzeCamera(
  videoUrl: string,
  durationMs: number,
  onProgress: (p: number, msg: string) => void,
  signal?: AbortSignal,
): Promise<{ track: Track3D; stats: AnalyzeStats }> {
  const t0 = performance.now();
  onProgress(0, 'Abrindo o vídeo…');
  const { ALL_FORMATS, CanvasSink, Input, UrlSource } = await import('mediabunny');
  const input = new Input({ source: new UrlSource(videoUrl), formats: ALL_FORMATS });
  const worker = new Worker(new URL('../../tracking3d/worker.ts', import.meta.url), { type: 'module' });
  const send = (m: WorkerIn, tr?: Transferable[]) => worker.postMessage(m, tr ?? []);
  let solveStart: number;
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('Vídeo sem imagem');
    const dw = track.displayWidth;
    const dh = track.displayHeight;
    const k = TRACK_SHORT / Math.min(dw, dh);
    const w = Math.round((dw * k) / 2) * 2;
    const h = Math.round((dh * k) / 2) * 2;
    const count = Math.max(2, Math.floor((durationMs / 1000) * TRACK_FPS));
    const first = await track.getFirstTimestamp();
    const times = Array.from({ length: count }, (_, i) => first + i / TRACK_FPS);
    const sink = new CanvasSink(track, { width: w, height: h, fit: 'fill' });

    const done = new Promise<Track3D | null>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerOut>) => {
        const m = e.data;
        if (m.type === 'progress') {
          if (m.stage === 'track') onProgress((m.value / count) * 0.8, `Rastreando pontos… ${m.value}/${count}`);
          else onProgress(0.8 + m.value * 0.2, 'Reconstruindo a câmera em 3D…');
        } else if (m.type === 'done') resolve(m.result);
        else reject(new Error(m.message));
      };
      worker.onerror = (e) => reject(new Error(e.message || 'falha no worker'));
    });
    send({ type: 'start', opts: { fps: TRACK_FPS, width: w, height: h, startMs: 0 } });

    let last: Uint8Array | null = null;
    let sent = 0;
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (signal?.aborted) throw new Error('cancelado');
      let gray: Uint8Array | null = null;
      if (wrapped) {
        const ctx = (wrapped.canvas as HTMLCanvasElement | OffscreenCanvas).getContext('2d', { willReadFrequently: true }) as
          | CanvasRenderingContext2D
          | OffscreenCanvasRenderingContext2D;
        const d = ctx.getImageData(0, 0, w, h).data;
        gray = new Uint8Array(w * h);
        for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
        last = gray;
      } else if (last) gray = last.slice(); // quadro não decodificado: repete
      if (!gray) continue;
      const copy = gray === last ? gray.slice() : gray;
      send({ type: 'frame', gray: copy }, [copy.buffer]);
      sent++;
    }
    if (sent < 10) throw new Error('Vídeo curto demais para rastrear a câmera');
    solveStart = performance.now();
    send({ type: 'finish' });
    const result = await done;
    if (!result) throw new Error('Não deu para rastrear: filme algo com textura (parede, chão) e mova a câmera devagar.');
    onProgress(1, 'Pronto');
    return { track: result, stats: { frames: result.poses.length, ms: performance.now() - t0, solveMs: performance.now() - solveStart } };
  } finally {
    worker.terminate();
    input.dispose();
  }
}

/** Motor "Precisão (Mac)": COLMAP no servidor local. Mais lento, mais exato. */
export async function colmapReady(): Promise<boolean> {
  try {
    const r = await fetch('/api/status');
    return r.ok && !!((await r.json()) as { colmap?: boolean }).colmap;
  } catch {
    return false;
  }
}

export async function analyzeCameraPrecise(
  src: string,
  durationMs: number,
  onProgress: (p: number, msg: string) => void,
  signal?: AbortSignal,
): Promise<{ track: Track3D; stats: AnalyzeStats }> {
  const t0 = performance.now();
  onProgress(0, 'Enviando para o motor de precisão…');
  const r = await fetch('/api/track3d', { method: 'POST', headers: { 'content-type': 'application/json', 'x-editor': '1' }, body: JSON.stringify({ src, durationMs }) });
  const j = (await r.json()) as { id?: string; error?: string };
  if (!r.ok || !j.id) throw new Error(j.error ?? 'falha ao iniciar');
  for (;;) {
    if (signal?.aborted) throw new Error('cancelado');
    await new Promise((res) => setTimeout(res, 700));
    const s = (await (await fetch(`/api/track3d/${j.id}`)).json()) as { status: string; progress: number; stage: string; error?: string; result?: Track3D };
    if (s.status === 'error') throw new Error(s.error ?? 'falha');
    if (s.status === 'done' && s.result) {
      onProgress(1, 'Pronto');
      return { track: s.result, stats: { frames: s.result.poses.length, ms: performance.now() - t0, solveMs: 0 } };
    }
    onProgress(s.progress, s.stage);
  }
}
