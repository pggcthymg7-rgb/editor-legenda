// Pipeline completo de rastreio 3D da câmera: quadros cinza → trilhas KLT → SfM (com busca da distância focal)
// → suavização → Track3D serializável. Puro (sem DOM): roda no Web Worker e nos testes em Node.
import { FeatureTracker } from './features';
import { type Track3D, packPose, smoothPoses } from './model';
import { type SfmResult, type Track, reconstruct } from './sfm';

/** Resolução de análise: lado menor em px (custo ∝ área). */
export const TRACK_SHORT = 360;
export const TRACK_FPS = 24;

export type PipelineOpts = { fps: number; width: number; height: number; startMs?: number; maxPoints?: number };

/** Focais candidatas (× lado maior). Celulares: 0,75–0,85 (grande-angular); zoom 2×–3×: 1,6–2,4. */
const FOCALS = [0.6, 0.72, 0.85, 1.05, 1.4, 2];

export function solveTracks(tracks: Track[], n: number, o: PipelineOpts, onProgress?: (p: number) => void): Track3D | null {
  const long = Math.max(o.width, o.height);
  let best: { r: SfmResult; f: number } | null = null;
  const score = (r: SfmResult) => r.err + (n - r.tracked) * 0.5;
  // 1ª passada grossa (amostra das trilhas), depois refina a melhor focal com todas
  const sample = tracks.length > 600 ? tracks.filter((_, i) => i % 2 === 0) : tracks;
  FOCALS.forEach((m, i) => {
    const r = reconstruct(sample, n, { f: m * long, cx: o.width / 2, cy: o.height / 2 });
    if (r && (!best || score(r) < score(best.r))) best = { r, f: m * long };
    onProgress?.((i + 1) / (FOCALS.length + 2));
  });
  if (!best) return null;
  let f = (best as { f: number }).f;
  // busca fina (seção áurea simplificada: ±15 %)
  let full: { r: SfmResult; f: number } | null = null;
  for (const m of [0.88, 1, 1.14]) {
    const cam = { f: f * m, cx: o.width / 2, cy: o.height / 2 };
    const r = reconstruct(tracks, n, cam);
    if (r && (!full || score(r) < score(full.r))) full = { r, f: cam.f };
  }
  onProgress?.(1);
  if (!full) return null;
  f = full.f;
  const smooth = smoothPoses(full.r.poses, o.fps);
  // amostra da nuvem (o projeto guarda no máximo 1500 pontos)
  const pts = full.r.points;
  const step = Math.max(1, Math.ceil(pts.length / 1500));
  return {
    fps: o.fps,
    width: o.width,
    height: o.height,
    cam: { f: Math.round(f * 100) / 100, cx: o.width / 2, cy: o.height / 2 },
    startMs: o.startMs ?? 0,
    poses: smooth.map(packPose),
    points: pts.filter((_, i) => i % step === 0).map((X) => X.map((v) => Math.round(v * 1e4) / 1e4) as typeof X),
    err: Math.round(full.r.err * 100) / 100,
  };
}

/** Uso incremental: empurra quadros e no fim resolve. */
export class CameraTracker {
  private readonly ft: FeatureTracker;
  constructor(private readonly o: PipelineOpts) {
    this.ft = new FeatureTracker(o.width, o.height, { maxPoints: o.maxPoints ?? 500 });
  }
  push(gray: Uint8Array) {
    this.ft.push(gray);
  }
  get frames() {
    return this.ft.frameCount;
  }
  finish(onProgress?: (p: number) => void): Track3D | null {
    return solveTracks(this.ft.result(4), this.ft.frameCount, this.o, onProgress);
  }
}
