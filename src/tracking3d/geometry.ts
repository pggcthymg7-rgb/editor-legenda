// Geometria de múltiplas vistas em coordenadas normalizadas da câmera (x = (u − cx) / f).
// Convenção: Xc = R·Xw + t (mundo → câmera), câmera olha para +z, y para baixo.
import { type M3, type V3, add, cross, det3, dot, inv3, mul3, mulV, norm, normalize, nullVector, rng, rodrigues, sample, scale, solve, sub, svd3, T3 } from './math';

export type Pose = { R: M3; t: V3 };
export type Pt2 = [number, number];

export const center = (P: Pose): V3 => scale(mulV(T3(P.R), P.t), -1);
export const toCam = (P: Pose, X: ArrayLike<number>): V3 => add(mulV(P.R, X), P.t);

/** Triangulação linear (DLT) por N vistas. */
export function triangulate(poses: Pose[], pts: Pt2[]): V3 | null {
  const A: number[][] = [];
  poses.forEach((P, i) => {
    const [x, y] = pts[i];
    const r0 = [P.R[0], P.R[1], P.R[2], P.t[0]];
    const r1 = [P.R[3], P.R[4], P.R[5], P.t[1]];
    const r2 = [P.R[6], P.R[7], P.R[8], P.t[2]];
    A.push(r2.map((v, k) => x * v - r0[k]), r2.map((v, k) => y * v - r1[k]));
  });
  const h = nullVector(A);
  if (Math.abs(h[3]) < 1e-12) return null;
  return [h[0] / h[3], h[1] / h[3], h[2] / h[3]];
}

/** Ângulo (rad) entre os raios das duas câmeras até X. */
export function parallax(P1: Pose, P2: Pose, X: V3): number {
  const a = normalize(sub(X, center(P1)));
  const b = normalize(sub(X, center(P2)));
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
}

/** Erro de reprojeção (unidades normalizadas). Infinity se atrás da câmera. */
export function reprojErr(P: Pose, X: ArrayLike<number>, p: Pt2): number {
  const c = toCam(P, X);
  if (c[2] <= 1e-6) return Infinity;
  return Math.hypot(c[0] / c[2] - p[0], c[1] / c[2] - p[1]);
}

// ---------- Matriz essencial (8 pontos + RANSAC) ----------
function essential8(a: Pt2[], b: Pt2[]): M3 | null {
  const A = a.map(([x1, y1], i) => {
    const [x2, y2] = b[i];
    return [x2 * x1, x2 * y1, x2, y2 * x1, y2 * y1, y2, x1, y1, 1];
  });
  const e = nullVector(A);
  const { U, V } = svd3(e);
  // força valores singulares (1, 1, 0)
  return mul3(mul3(U, [1, 0, 0, 0, 1, 0, 0, 0, 0]), T3(V));
}

function sampson(E: M3, p: Pt2, q: Pt2): number {
  const x1: V3 = [p[0], p[1], 1];
  const x2: V3 = [q[0], q[1], 1];
  const Ex1 = mulV(E, x1);
  const Etx2 = mulV(T3(E), x2);
  const num = dot(x2, Ex1);
  return (num * num) / (Ex1[0] ** 2 + Ex1[1] ** 2 + Etx2[0] ** 2 + Etx2[1] ** 2 + 1e-18);
}

export function ransacEssential(a: Pt2[], b: Pt2[], thr: number, iters = 256, seed = 7): { E: M3; inliers: boolean[] } | null {
  if (a.length < 8) return null;
  const rand = rng(seed);
  let best: { E: M3; inliers: boolean[]; n: number } | null = null;
  const t2 = thr * thr;
  for (let it = 0; it < iters; it++) {
    const idx = sample(a.length, 8, rand);
    const E = essential8(idx.map((i) => a[i]), idx.map((i) => b[i]));
    if (!E) continue;
    const inl = a.map((p, i) => sampson(E, p, b[i]) < t2);
    const n = inl.filter(Boolean).length;
    if (!best || n > best.n) best = { E, inliers: inl, n };
  }
  if (!best || best.n < 8) return null;
  const ia = a.filter((_, i) => best!.inliers[i]);
  const ib = b.filter((_, i) => best!.inliers[i]);
  const E = essential8(ia, ib) ?? best.E;
  return { E, inliers: a.map((p, i) => sampson(E, p, b[i]) < t2) };
}

/** As 4 soluções (R, t) de uma matriz essencial. */
export function decomposeE(E: M3): Pose[] {
  let { U, V } = svd3(E);
  if (det3(U) < 0) U = U.map((v, i) => (i % 3 === 2 ? -v : v));
  if (det3(V) < 0) V = V.map((v, i) => (i % 3 === 2 ? -v : v));
  const W: M3 = [0, -1, 0, 1, 0, 0, 0, 0, 1];
  const R1 = mul3(mul3(U, W), T3(V));
  const R2 = mul3(mul3(U, T3(W)), T3(V));
  const u3: V3 = [U[2], U[5], U[8]];
  return [
    { R: R1, t: u3 },
    { R: R1, t: scale(u3, -1) },
    { R: R2, t: u3 },
    { R: R2, t: scale(u3, -1) },
  ];
}

// ---------- Homografia (4 pontos + RANSAC) e decomposição de Faugeras ----------
export function homographyDLT(a: Pt2[], b: Pt2[]): M3 | null {
  if (a.length < 4) return null;
  // normalização de Hartley para estabilidade
  const norm2 = (ps: Pt2[]) => {
    const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length;
    const my = ps.reduce((s, p) => s + p[1], 0) / ps.length;
    const d = ps.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / ps.length || 1;
    const k = Math.SQRT2 / d;
    return { T: [k, 0, -k * mx, 0, k, -k * my, 0, 0, 1] as M3, ps: ps.map(([x, y]) => [k * (x - mx), k * (y - my)] as Pt2) };
  };
  const na = norm2(a);
  const nb = norm2(b);
  const A: number[][] = [];
  na.ps.forEach(([x, y], i) => {
    const [u, v] = nb.ps[i];
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u], [0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  });
  const h = nullVector(A);
  const Tbi = inv3(nb.T);
  if (!Tbi) return null;
  const H = mul3(mul3(Tbi, h), na.T);
  const s = H[8];
  return Math.abs(s) > 1e-12 ? H.map((v) => v / s) : H;
}

export const applyH = (H: M3, p: ArrayLike<number>): Pt2 => {
  const w = H[6] * p[0] + H[7] * p[1] + H[8];
  return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w];
};

export function ransacHomography(a: Pt2[], b: Pt2[], thr: number, iters = 256, seed = 11): { H: M3; inliers: boolean[] } | null {
  if (a.length < 4) return null;
  const rand = rng(seed);
  let best: { H: M3; n: number } | null = null;
  const err = (H: M3, i: number) => {
    const q = applyH(H, a[i]);
    return Math.hypot(q[0] - b[i][0], q[1] - b[i][1]);
  };
  for (let it = 0; it < iters; it++) {
    const idx = sample(a.length, 4, rand);
    const H = homographyDLT(idx.map((i) => a[i]), idx.map((i) => b[i]));
    if (!H || !H.every(Number.isFinite)) continue;
    let n = 0;
    for (let i = 0; i < a.length; i++) if (err(H, i) < thr) n++;
    if (!best || n > best.n) best = { H, n };
  }
  if (!best || best.n < 4) return null;
  let H = best.H;
  for (let k = 0; k < 2; k++) {
    const inl = a.map((_, i) => err(H, i) < thr);
    const H2 = homographyDLT(a.filter((_, i) => inl[i]), b.filter((_, i) => inl[i]));
    if (H2 && H2.every(Number.isFinite)) H = H2;
  }
  return { H, inliers: a.map((_, i) => err(H, i) < thr) };
}

/** Até 8 soluções (R, t) de uma homografia em coordenadas normalizadas (método de Faugeras). */
export function decomposeH(H: M3): Pose[] {
  const { U, s, V } = svd3(H);
  const [d1, d2, d3] = s;
  if (d1 / d2 < 1.00001 || d2 / d3 < 1.00001) return [];
  const sg = det3(U) * det3(V);
  const aux1 = Math.sqrt((d1 * d1 - d2 * d2) / (d1 * d1 - d3 * d3));
  const aux3 = Math.sqrt((d2 * d2 - d3 * d3) / (d1 * d1 - d3 * d3));
  const x1 = [aux1, aux1, -aux1, -aux1];
  const x3 = [aux3, -aux3, aux3, -aux3];
  const out: Pose[] = [];
  const Vt = T3(V);
  const st = Math.sqrt((d1 * d1 - d2 * d2) * (d2 * d2 - d3 * d3)) / ((d1 + d3) * d2);
  const ct = (d2 * d2 + d1 * d3) / ((d1 + d3) * d2);
  const sts = [st, -st, -st, st];
  for (let i = 0; i < 4; i++) {
    const Rp: M3 = [ct, 0, -sts[i], 0, 1, 0, sts[i], 0, ct];
    const R = mul3(mul3(U, Rp), Vt).map((v) => v * sg);
    const t = normalize(mulV(U, [x1[i] * (d1 - d3), 0, -x3[i] * (d1 - d3)]));
    out.push({ R, t });
  }
  const sp = Math.sqrt((d1 * d1 - d2 * d2) * (d2 * d2 - d3 * d3)) / ((d1 - d3) * d2);
  const cp = (d1 * d3 - d2 * d2) / ((d1 - d3) * d2);
  const sps = [sp, -sp, -sp, sp];
  for (let i = 0; i < 4; i++) {
    const Rp: M3 = [cp, 0, sps[i], 0, -1, 0, sps[i], 0, -cp];
    const R = mul3(mul3(U, Rp), Vt).map((v) => v * sg);
    const t = normalize(mulV(U, [x1[i] * (d1 + d3), 0, x3[i] * (d1 + d3)]));
    out.push({ R, t });
  }
  return out.filter((p) => p.R.every(Number.isFinite) && p.t.every(Number.isFinite) && det3(p.R) > 0);
}

// ---------- Refinamento não linear (Gauss-Newton com pesos de Huber) ----------
/** Refina a pose da câmera dados pontos 3D e observações. `huber` em unidades normalizadas. */
export function refinePose(P: Pose, X: ArrayLike<number>[], obs: Pt2[], huber: number, iters = 8): Pose {
  let { R, t } = P;
  let lambda = 1e-4;
  const cost = (R_: M3, t_: V3) => {
    let c = 0;
    for (let i = 0; i < X.length; i++) {
      const xc = add(mulV(R_, X[i]), t_);
      if (xc[2] <= 1e-6) {
        c += huber * huber * 4;
        continue;
      }
      const r = Math.hypot(xc[0] / xc[2] - obs[i][0], xc[1] / xc[2] - obs[i][1]);
      c += r < huber ? r * r : 2 * huber * r - huber * huber;
    }
    return c;
  };
  let c0 = cost(R, t);
  for (let it = 0; it < iters; it++) {
    const H = Array.from({ length: 6 }, () => new Array<number>(6).fill(0));
    const g = new Array<number>(6).fill(0);
    for (let i = 0; i < X.length; i++) {
      const [x, y, z] = add(mulV(R, X[i]), t);
      if (z <= 1e-6) continue;
      const iz = 1 / z;
      const rx = x * iz - obs[i][0];
      const ry = y * iz - obs[i][1];
      const r = Math.hypot(rx, ry);
      const w = r < huber ? 1 : huber / r;
      // d(u,v)/dXc
      const ju = [iz, 0, -x * iz * iz];
      const jv = [0, iz, -y * iz * iz];
      // dXc/dω = −[Xc]×, dXc/dt = I
      const dXc = [
        [0, z, -y, 1, 0, 0],
        [-z, 0, x, 0, 1, 0],
        [y, -x, 0, 0, 0, 1],
      ];
      const Ju = new Array<number>(6);
      const Jv = new Array<number>(6);
      for (let k = 0; k < 6; k++) {
        Ju[k] = ju[0] * dXc[0][k] + ju[2] * dXc[2][k];
        Jv[k] = jv[1] * dXc[1][k] + jv[2] * dXc[2][k];
      }
      for (let a = 0; a < 6; a++) {
        g[a] += w * (Ju[a] * rx + Jv[a] * ry);
        for (let b = a; b < 6; b++) H[a][b] += w * (Ju[a] * Ju[b] + Jv[a] * Jv[b]);
      }
    }
    for (let a = 0; a < 6; a++) for (let b = 0; b < a; b++) H[a][b] = H[b][a];
    let improved = false;
    for (let tries = 0; tries < 5 && !improved; tries++) {
      const Hd = H.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lambda) + 1e-12 : v)));
      const d = solve(Hd, g.map((v) => -v));
      if (!d) break;
      const dR = rodrigues([d[0], d[1], d[2]]);
      const R2 = mul3(dR, R);
      const t2 = add(mulV(dR, t), [d[3], d[4], d[5]]);
      const c1 = cost(R2, t2);
      if (c1 < c0) {
        R = R2;
        t = t2;
        const done = c0 - c1 < 1e-12 * (1 + c0);
        c0 = c1;
        lambda = Math.max(1e-7, lambda / 3);
        improved = true;
        if (done) return { R, t };
      } else lambda *= 8;
    }
    if (!improved) break;
  }
  return { R, t };
}

/** Refina um ponto 3D dadas as poses que o observam. */
export function refinePoint(X: V3, poses: Pose[], obs: Pt2[], huber: number, iters = 5): V3 {
  let P = X;
  for (let it = 0; it < iters; it++) {
    const H = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const g = [0, 0, 0];
    for (let i = 0; i < poses.length; i++) {
      const { R } = poses[i];
      const [x, y, z] = toCam(poses[i], P);
      if (z <= 1e-6) continue;
      const iz = 1 / z;
      const rx = x * iz - obs[i][0];
      const ry = y * iz - obs[i][1];
      const r = Math.hypot(rx, ry);
      const w = r < huber ? 1 : huber / r;
      const Ju = [0, 1, 2].map((k) => iz * R[k] - x * iz * iz * R[6 + k]);
      const Jv = [0, 1, 2].map((k) => iz * R[3 + k] - y * iz * iz * R[6 + k]);
      for (let a = 0; a < 3; a++) {
        g[a] += w * (Ju[a] * rx + Jv[a] * ry);
        for (let b = 0; b < 3; b++) H[a][b] += w * (Ju[a] * Ju[b] + Jv[a] * Jv[b]);
      }
    }
    for (let a = 0; a < 3; a++) H[a][a] = H[a][a] * 1.001 + 1e-12;
    const d = solve(H, g.map((v) => -v));
    if (!d || !d.every(Number.isFinite)) break;
    P = add(P, d as V3);
    if (norm(d) < 1e-9 * (1 + norm(P))) break;
  }
  return P;
}

/** Plano z = n·X + d por RANSAC em pontos 3D. Retorna normal unitária e ponto sobre o plano. */
export function ransacPlane(pts: V3[], thr: number, iters = 128, seed = 3): { n: V3; p: V3; inliers: number } | null {
  if (pts.length < 3) return null;
  const rand = rng(seed);
  let best: { n: V3; p: V3; inliers: number } | null = null;
  for (let it = 0; it < iters; it++) {
    const [i, j, k] = sample(pts.length, 3, rand);
    const n = cross(sub(pts[j], pts[i]), sub(pts[k], pts[i]));
    if (norm(n) < 1e-12) continue;
    const nn = normalize(n);
    const c = dot(nn, pts[i]);
    const inl = pts.filter((q) => Math.abs(dot(nn, q) - c) < thr);
    if (!best || inl.length > best.inliers) {
      // reajuste por mínimos quadrados (menor autovetor da covariância)
      const m = inl.reduce((s, q) => add(s, q), [0, 0, 0] as V3).map((v) => v / inl.length) as V3;
      const C = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      for (const q of inl) {
        const d = sub(q, m);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += d[a] * d[b];
      }
      const ln = inl.length >= 3 ? (nullVectorSym(C) as V3) : nn;
      best = { n: normalize(ln), p: m, inliers: inl.length };
    }
  }
  return best;
}

function nullVectorSym(C: number[][]): number[] {
  // menor autovetor de matriz simétrica 3x3
  const A = [C[0], C[1], C[2]];
  return nullVector(A.map((r) => r.slice()));
}

export const _internal = { essential8, sampson };

