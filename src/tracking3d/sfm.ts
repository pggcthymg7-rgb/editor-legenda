// Reconstrução 3D incremental (Structure-from-Motion) a partir das trilhas de pontos (KLT):
// par inicial (matriz essencial OU homografia, para paredes planas) → PnP quadro a quadro →
// triangulação de pontos novos → ajuste em janela e global (alternando pontos e poses).
import { type Pose, type Pt2, decomposeE, decomposeH, parallax, ransacEssential, ransacHomography, refinePoint, refinePose, reprojErr, toCam, triangulate } from './geometry';
import { type V3, I3, median, mulV, scale } from './math';

/** Trilha contínua de um ponto: posições (px na resolução de análise) a partir do quadro `start`. */
export type Track = { start: number; xs: number[]; ys: number[] };
export type Camera = { f: number; cx: number; cy: number };
export type SfmResult = { poses: Pose[]; points: V3[]; err: number; tracked: number; pointTracks: number[] };

type Opts = { thrPx?: number; minParallaxDeg?: number; onProgress?: (p: number) => void };

const end = (t: Track) => t.start + t.xs.length;

export function reconstruct(tracks: Track[], nFrames: number, cam: Camera, opts: Opts = {}): SfmResult | null {
  const thr = (opts.thrPx ?? 2) / cam.f;
  const minPar = ((opts.minParallaxDeg ?? 1) * Math.PI) / 180;
  const obs = (ti: number, f: number): Pt2 | null => {
    const t = tracks[ti];
    if (f < t.start || f >= end(t)) return null;
    const i = f - t.start;
    return [(t.xs[i] - cam.cx) / cam.f, (t.ys[i] - cam.cy) / cam.f];
  };
  const byFrame: number[][] = Array.from({ length: nFrames }, () => []);
  tracks.forEach((t, ti) => {
    for (let f = t.start; f < Math.min(end(t), nFrames); f++) byFrame[f].push(ti);
  });

  const poses: (Pose | null)[] = new Array(nFrames).fill(null);
  const pts: (V3 | null)[] = new Array(tracks.length).fill(null);
  const banned = new Uint8Array(tracks.length);

  // ---------- par inicial ----------
  const tryInit = (i: number, k: number): boolean => {
    const common = byFrame[i].filter((ti) => end(tracks[ti]) > k);
    if (common.length < 20) return false;
    const a = common.map((ti) => obs(ti, i)!);
    const b = common.map((ti) => obs(ti, k)!);
    const cands: Pose[] = [];
    const E = ransacEssential(a, b, thr);
    if (E) cands.push(...decomposeE(E.E));
    const H = ransacHomography(a, b, thr * 1.5);
    if (H) cands.push(...decomposeH(H.H));
    const P1: Pose = { R: I3(), t: [0, 0, 0] };
    let best: { P: Pose; good: number[]; X: V3[]; par: number } | null = null;
    for (const P2 of cands) {
      const good: number[] = [];
      const X: V3[] = [];
      const pars: number[] = [];
      common.forEach((ti, j) => {
        const x = triangulate([P1, P2], [a[j], b[j]]);
        if (!x || reprojErr(P1, x, a[j]) > 2 * thr || reprojErr(P2, x, b[j]) > 2 * thr) return;
        good.push(ti);
        X.push(x);
        pars.push(parallax(P1, P2, x));
      });
      const par = median(pars);
      if (!best || good.length > best.good.length * 1.05 || (good.length >= best.good.length * 0.95 && par > best.par)) best = { P: P2, good, X, par };
    }
    if (!best || best.good.length < Math.max(15, common.length * 0.4) || best.par < minPar) return false;
    poses[i] = P1;
    poses[k] = best.P;
    best.good.forEach((ti, j) => (pts[ti] = best!.X[j]));
    for (let it = 0; it < 3; it++) {
      refinePoints(best.good, [i, k]);
      poses[k] = poseFrom(k, poses[k]!);
    }
    return true;
  };

  const posedObs = (ti: number, frames?: number[], maxN = 12) => {
    const t = tracks[ti];
    const fs: number[] = [];
    for (let f = t.start; f < Math.min(end(t), nFrames); f++) if (poses[f] && (!frames || frames.includes(f))) fs.push(f);
    if (fs.length <= maxN) return fs;
    const out: number[] = [];
    for (let j = 0; j < maxN; j++) out.push(fs[Math.round((j * (fs.length - 1)) / (maxN - 1))]);
    return out;
  };

  const refinePoints = (tis: number[], frames?: number[]) => {
    for (const ti of tis) {
      const X = pts[ti];
      if (!X) continue;
      const fs = posedObs(ti, frames);
      if (fs.length < 2) continue;
      const P = refinePoint(X, fs.map((f) => poses[f]!), fs.map((f) => obs(ti, f)!), thr);
      const bad = fs.some((f) => reprojErr(poses[f]!, P, obs(ti, f)!) > 4 * thr);
      if (bad || !P.every(Number.isFinite)) {
        pts[ti] = null;
        banned[ti] = 1;
      } else pts[ti] = P;
    }
  };

  const poseFrom = (f: number, init: Pose): Pose => {
    const tis = byFrame[f].filter((ti) => pts[ti]);
    if (tis.length < 6) return init;
    const X = tis.map((ti) => pts[ti]!);
    const o = tis.map((ti) => obs(ti, f)!);
    let P = refinePose(init, X, o, thr);
    const inl = tis.map((_ti, j) => reprojErr(P, X[j], o[j]) < 3 * thr);
    if (inl.filter(Boolean).length >= 6) {
      P = refinePose(P, X.filter((_, j) => inl[j]), o.filter((_, j) => inl[j]), thr, 4);
    }
    return P;
  };

  let init: [number, number] | null = null;
  const W = cam.cx * 2;
  for (let i0 = 0; i0 < Math.max(1, nFrames - 10) && !init; i0 += 10) {
    let bestK = -1;
    let bestD = 0;
    for (let k = i0 + 3; k < Math.min(nFrames, i0 + 120); k++) {
      const common = byFrame[i0].filter((ti) => end(tracks[ti]) > k);
      if (common.length < 20) break;
      const d = median(common.map((ti) => Math.hypot(...(obs(ti, k)!.map((v, c) => v - obs(ti, i0)![c]) as Pt2)) * cam.f));
      if (d > bestD) {
        bestD = d;
        bestK = k;
      }
      if (d >= 0.06 * W) break;
    }
    if (bestK > 0 && bestD >= 0.015 * W && tryInit(i0, bestK)) init = [i0, bestK];
    if (i0 > nFrames / 2) break;
  }
  if (!init) return null;

  // ---------- quadro a quadro (para frente e depois para trás) ----------
  const [i0] = init;
  const order = [...Array.from({ length: nFrames - i0 - 1 }, (_, j) => i0 + 1 + j), ...Array.from({ length: i0 }, (_, j) => i0 - 1 - j)];
  let done = 0;
  let lastPose: Pose = poses[i0]!;
  for (const f of order) {
    if (f === i0 - 1) lastPose = poses[i0]!;
    const vis = byFrame[f].filter((ti) => pts[ti]);
    if (vis.length < 8) {
      poses[f] = null;
      continue;
    }
    poses[f] = poseFrom(f, poses[f] ?? lastPose);
    lastPose = poses[f]!;
    // pontos novos
    for (const ti of byFrame[f]) {
      if (pts[ti] || banned[ti]) continue;
      const fs = posedObs(ti, undefined, 8);
      if (fs.length < 3) continue;
      const a = fs[0];
      const b = fs[fs.length - 1];
      const X = triangulate(fs.map((g) => poses[g]!), fs.map((g) => obs(ti, g)!));
      if (!X || parallax(poses[a]!, poses[b]!, X) < minPar) continue;
      if (fs.some((g) => reprojErr(poses[g]!, X, obs(ti, g)!) > 2 * thr)) continue;
      pts[ti] = X;
    }
    done++;
    if (done % 8 === 0) {
      const win = order.slice(Math.max(0, done - 24), done);
      const inWin = new Set<number>();
      for (const g of win) for (const ti of byFrame[g]) if (pts[ti]) inWin.add(ti);
      refinePoints([...inWin]);
      for (const g of win) if (poses[g]) poses[g] = poseFrom(g, poses[g]!);
      opts.onProgress?.(done / order.length);
    }
  }

  // ---------- ajuste global ----------
  const all = pts.map((_, ti) => ti);
  for (let it = 0; it < 3; it++) {
    refinePoints(all);
    for (let f = 0; f < nFrames; f++) if (poses[f]) poses[f] = poseFrom(f, poses[f]!);
  }

  const tracked = poses.filter(Boolean).length;
  if (tracked < 2) return null;
  // quadros perdidos: repete a pose vizinha mais próxima
  const filled: Pose[] = new Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    if (poses[f]) {
      filled[f] = poses[f]!;
      continue;
    }
    let d = 1;
    while (!poses[f - d] && !poses[f + d]) d++;
    filled[f] = (poses[f - d] ?? poses[f + d])!;
  }

  // escala: profundidade mediana = 1 no primeiro quadro analisado
  const depths: number[] = [];
  for (const ti of byFrame[i0]) if (pts[ti]) depths.push(toCam(filled[i0], pts[ti]!)[2]);
  const s = 1 / (median(depths) || 1);
  const points: V3[] = [];
  const pointTracks: number[] = [];
  let sum = 0;
  let cnt = 0;
  pts.forEach((X, ti) => {
    if (!X) return;
    for (const f of posedObs(ti, undefined, 1e9)) {
      const e = reprojErr(poses[f]!, X, obs(ti, f)!);
      if (Number.isFinite(e)) {
        sum += e;
        cnt++;
      }
    }
    points.push(scale(X, s));
    pointTracks.push(ti);
  });
  const out = filled.map((P) => ({ R: P.R, t: scale(P.t, s) }));
  return { poses: out, points, err: cnt ? (sum / cnt) * cam.f : Infinity, tracked, pointTracks };
}

/** Projeta X (mundo) em px com a câmera. null se atrás. */
export function projectPx(P: Pose, X: ArrayLike<number>, cam: Camera): [number, number] | null {
  const c = mulV(P.R, X).map((v, i) => v + P.t[i]);
  if (c[2] <= 1e-6) return null;
  return [cam.f * (c[0] / c[2]) + cam.cx, cam.f * (c[1] / c[2]) + cam.cy];
}
