// Rastreamento de pontos na imagem (CPU, roda no Web Worker): pirâmide, cantos de Shi-Tomasi
// e fluxo óptico de Lucas-Kanade piramidal com checagem ida-e-volta (descarta trilhas ruins).
import type { Track } from './sfm';

type Level = { w: number; h: number; d: Float32Array };

function pyramid(gray: Uint8Array, w: number, h: number, levels: number): Level[] {
  const out: Level[] = [];
  // nível 0 levemente suavizado (binomial 3x3) para reduzir ruído de compressão
  const d0 = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      d0[y * w + x] =
        (gray[y0 * w + x0] + 2 * gray[y0 * w + x] + gray[y0 * w + x1] + 2 * gray[y * w + x0] + 4 * gray[y * w + x] + 2 * gray[y * w + x1] + gray[y1 * w + x0] + 2 * gray[y1 * w + x] + gray[y1 * w + x1]) /
        16;
    }
  }
  out.push({ w, h, d: d0 });
  for (let l = 1; l < levels; l++) {
    const p = out[l - 1];
    const nw = p.w >> 1;
    const nh = p.h >> 1;
    if (nw < 16 || nh < 16) break;
    const d = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++)
      for (let x = 0; x < nw; x++) {
        const i = 2 * y * p.w + 2 * x;
        d[y * nw + x] = (p.d[i] + p.d[i + 1] + p.d[i + p.w] + p.d[i + p.w + 1]) / 4;
      }
    out.push({ w: nw, h: nh, d });
  }
  return out;
}

const sampleB = (L: Level, x: number, y: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const ax = x - x0;
  const ay = y - y0;
  const i = y0 * L.w + x0;
  return (1 - ay) * ((1 - ax) * L.d[i] + ax * L.d[i + 1]) + ay * ((1 - ax) * L.d[i + L.w] + ax * L.d[i + L.w + 1]);
};

const HW = 7; // meia janela (15x15)
const WIN = 2 * HW + 1;

/** Lucas-Kanade piramidal de um ponto de A para B. Retorna nova posição ou null. */
function lk(A: Level[], B: Level[], x: number, y: number, gx: number, gy: number): [number, number, number] | null {
  let dx = gx / 2 ** (A.length - 1);
  let dy = gy / 2 ** (A.length - 1);
  const T = new Float32Array(WIN * WIN);
  const Ix = new Float32Array(WIN * WIN);
  const Iy = new Float32Array(WIN * WIN);
  let resid = 0;
  for (let l = A.length - 1; l >= 0; l--) {
    const La = A[l];
    const Lb = B[l];
    const s = 2 ** l;
    const px = x / s;
    const py = y / s;
    if (px < HW + 1 || py < HW + 1 || px > La.w - HW - 2 || py > La.h - HW - 2) {
      if (l === 0) return null;
      dx *= 2;
      dy *= 2;
      continue;
    }
    let gxx = 0;
    let gxy = 0;
    let gyy = 0;
    let k = 0;
    for (let j = -HW; j <= HW; j++)
      for (let i = -HW; i <= HW; i++, k++) {
        const v = sampleB(La, px + i, py + j);
        T[k] = v;
        const ix = (sampleB(La, px + i + 1, py + j) - sampleB(La, px + i - 1, py + j)) / 2;
        const iy = (sampleB(La, px + i, py + j + 1) - sampleB(La, px + i, py + j - 1)) / 2;
        Ix[k] = ix;
        Iy[k] = iy;
        gxx += ix * ix;
        gxy += ix * iy;
        gyy += iy * iy;
      }
    const det = gxx * gyy - gxy * gxy;
    const minEig = (gxx + gyy) / 2 - Math.sqrt(((gxx - gyy) / 2) ** 2 + gxy * gxy);
    if (det < 1e-6 || minEig / (WIN * WIN) < 0.5) return null;
    for (let it = 0; it < 12; it++) {
      const qx = px + dx;
      const qy = py + dy;
      if (qx < HW + 1 || qy < HW + 1 || qx > Lb.w - HW - 2 || qy > Lb.h - HW - 2) return null;
      let bx = 0;
      let by = 0;
      resid = 0;
      k = 0;
      for (let j = -HW; j <= HW; j++)
        for (let i = -HW; i <= HW; i++, k++) {
          const e = T[k] - sampleB(Lb, qx + i, qy + j);
          bx += e * Ix[k];
          by += e * Iy[k];
          resid += Math.abs(e);
        }
      const ux = (gyy * bx - gxy * by) / det;
      const uy = (gxx * by - gxy * bx) / det;
      dx += ux;
      dy += uy;
      if (ux * ux + uy * uy < 1e-4) break;
    }
    if (l > 0) {
      dx *= 2;
      dy *= 2;
    }
  }
  return [x + dx, y + dy, resid / (WIN * WIN)];
}

/** Cantos de Shi-Tomasi (menor autovalor), um por célula da grade, longe dos já rastreados. */
function detect(L: Level, existing: [number, number][], cell: number, max: number): [number, number][] {
  const { w, h, d } = L;
  const score = new Float32Array(w * h);
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      gx[i] = (d[i + 1] - d[i - 1]) / 2;
      gy[i] = (d[i + w] - d[i - w]) / 2;
    }
  let best = 0;
  const R = 2;
  const m = HW + 3;
  for (let y = m; y < h - m; y++)
    for (let x = m; x < w - m; x++) {
      let a = 0;
      let b = 0;
      let c = 0;
      for (let j = -R; j <= R; j++)
        for (let i = -R; i <= R; i++) {
          const k = (y + j) * w + x + i;
          a += gx[k] * gx[k];
          b += gx[k] * gy[k];
          c += gy[k] * gy[k];
        }
      const s = (a + c) / 2 - Math.sqrt(((a - c) / 2) ** 2 + b * b);
      score[y * w + x] = s;
      if (s > best) best = s;
    }
  const minD = cell * 0.6;
  const occ = new Set<string>();
  for (const [x, y] of existing) occ.add(`${Math.floor(x / cell)},${Math.floor(y / cell)}`);
  const out: [number, number][] = [];
  const cand: [number, number, number][] = [];
  for (let cy = 0; cy * cell < h; cy++)
    for (let cx = 0; cx * cell < w; cx++) {
      if (occ.has(`${cx},${cy}`)) continue;
      let bs = 0;
      let bx = -1;
      let by = -1;
      for (let y = Math.max(m, cy * cell); y < Math.min(h - m, (cy + 1) * cell); y++)
        for (let x = Math.max(m, cx * cell); x < Math.min(w - m, (cx + 1) * cell); x++) {
          const s = score[y * w + x];
          if (s > bs) {
            bs = s;
            bx = x;
            by = y;
          }
        }
      if (bx >= 0 && bs > best * 0.02 && bs > 25 * 25) cand.push([bs, bx, by]);
    }
  cand.sort((p, q) => q[0] - p[0]);
  for (const [, x, y] of cand) {
    if (out.length >= max) break;
    if (existing.some(([ex, ey]) => Math.abs(ex - x) < minD && Math.abs(ey - y) < minD)) continue;
    out.push([x, y]);
  }
  return out;
}

export type TrackerOpts = { cell?: number; maxPoints?: number; levels?: number; fbThr?: number };

/** Recebe quadros em tons de cinza um a um e mantém as trilhas dos pontos. */
export class FeatureTracker {
  readonly tracks: Track[] = [];
  private active: number[] = [];
  private prev: Level[] | null = null;
  private frame = 0;
  private readonly o: Required<TrackerOpts>;
  constructor(
    readonly w: number,
    readonly h: number,
    opts: TrackerOpts = {},
  ) {
    const cell = opts.cell ?? Math.max(16, Math.round(Math.sqrt((w * h) / (opts.maxPoints ?? 400))));
    this.o = { cell, maxPoints: opts.maxPoints ?? 400, levels: opts.levels ?? 4, fbThr: opts.fbThr ?? 0.7 };
  }

  push(gray: Uint8Array): void {
    const cur = pyramid(gray, this.w, this.h, this.o.levels);
    const f = this.frame++;
    if (this.prev) {
      const keep: number[] = [];
      for (const ti of this.active) {
        const t = this.tracks[ti];
        const x = t.xs[t.xs.length - 1];
        const y = t.ys[t.ys.length - 1];
        // chute: velocidade do quadro anterior
        const n = t.xs.length;
        const vx = n > 1 ? x - t.xs[n - 2] : 0;
        const vy = n > 1 ? y - t.ys[n - 2] : 0;
        const fw = lk(this.prev, cur, x, y, vx, vy);
        if (!fw || fw[2] > 18) continue;
        const bw = lk(cur, this.prev, fw[0], fw[1], x - fw[0], y - fw[1]);
        if (!bw || Math.hypot(bw[0] - x, bw[1] - y) > this.o.fbThr) continue;
        t.xs.push(fw[0]);
        t.ys.push(fw[1]);
        keep.push(ti);
      }
      this.active = keep;
    }
    if (this.active.length < this.o.maxPoints * 0.8) {
      const ex = this.active.map((ti) => {
        const t = this.tracks[ti];
        return [t.xs[t.xs.length - 1], t.ys[t.ys.length - 1]] as [number, number];
      });
      for (const [x, y] of detect(cur[0], ex, this.o.cell, this.o.maxPoints - this.active.length)) {
        this.tracks.push({ start: f, xs: [x], ys: [y] });
        this.active.push(this.tracks.length - 1);
      }
    }
    this.prev = cur;
  }

  get frameCount() {
    return this.frame;
  }

  /** Trilhas com pelo menos `min` quadros. */
  result(min = 3): Track[] {
    return this.tracks.filter((t) => t.xs.length >= min);
  }
}

