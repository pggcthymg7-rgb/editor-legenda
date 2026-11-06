// Álgebra linear mínima para o rastreamento 3D (sem dependências): vetores 3D, matrizes 3x3
// (linha a linha), rotações, autovalores de matriz simétrica (Jacobi) e sistemas lineares.
export type V3 = [number, number, number];
/** matriz 3x3 em ordem de linha (9 números) */
export type M3 = number[];

export const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: ArrayLike<number>, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const norm = (a: ArrayLike<number>) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: ArrayLike<number>): V3 => {
  const n = norm(a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

export const I3 = (): M3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mul3 = (A: M3, B: M3): M3 => {
  const C = new Array<number>(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
};
export const mulV = (A: M3, v: ArrayLike<number>): V3 => [
  A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
  A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
  A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
];
export const T3 = (A: M3): M3 => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
export const det3 = (A: M3) => A[0] * (A[4] * A[8] - A[5] * A[7]) - A[1] * (A[3] * A[8] - A[5] * A[6]) + A[2] * (A[3] * A[7] - A[4] * A[6]);
export const inv3 = (A: M3): M3 | null => {
  const d = det3(A);
  if (!Number.isFinite(d) || Math.abs(d) < 1e-14) return null;
  const k = 1 / d;
  return [
    (A[4] * A[8] - A[5] * A[7]) * k,
    (A[2] * A[7] - A[1] * A[8]) * k,
    (A[1] * A[5] - A[2] * A[4]) * k,
    (A[5] * A[6] - A[3] * A[8]) * k,
    (A[0] * A[8] - A[2] * A[6]) * k,
    (A[2] * A[3] - A[0] * A[5]) * k,
    (A[3] * A[7] - A[4] * A[6]) * k,
    (A[1] * A[6] - A[0] * A[7]) * k,
    (A[0] * A[4] - A[1] * A[3]) * k,
  ];
};

/** Rotação a partir do vetor de eixo-ângulo (mapa exponencial de Rodrigues). */
export function rodrigues(w: ArrayLike<number>): M3 {
  const th = norm(w);
  if (th < 1e-12) return [1, -w[2], w[1], w[2], 1, -w[0], -w[1], w[0], 1];
  const [x, y, z] = [w[0] / th, w[1] / th, w[2] / th];
  const c = Math.cos(th);
  const s = Math.sin(th);
  const C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}

/** Quatérnio [w, x, y, z] de uma rotação. */
export function quatFromMat(R: M3): [number, number, number, number] {
  const tr = R[0] + R[4] + R[8];
  let q: [number, number, number, number];
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [0.25 * s, (R[7] - R[5]) / s, (R[2] - R[6]) / s, (R[3] - R[1]) / s];
  } else if (R[0] > R[4] && R[0] > R[8]) {
    const s = Math.sqrt(1 + R[0] - R[4] - R[8]) * 2;
    q = [(R[7] - R[5]) / s, 0.25 * s, (R[1] + R[3]) / s, (R[2] + R[6]) / s];
  } else if (R[4] > R[8]) {
    const s = Math.sqrt(1 + R[4] - R[0] - R[8]) * 2;
    q = [(R[2] - R[6]) / s, (R[1] + R[3]) / s, 0.25 * s, (R[5] + R[7]) / s];
  } else {
    const s = Math.sqrt(1 + R[8] - R[0] - R[4]) * 2;
    q = [(R[3] - R[1]) / s, (R[2] + R[6]) / s, (R[5] + R[7]) / s, 0.25 * s];
  }
  const n = Math.hypot(...q) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function matFromQuat(q: ArrayLike<number>): M3 {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const [w, x, y, z] = [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/** Autovalores/autovetores de matriz simétrica n×n (Jacobi cíclico). Ordem crescente; vetores[k] é o k-ésimo autovetor. */
export function eigSym(S: number[][]): { values: number[]; vectors: number[][] } {
  const n = S.length;
  const a = S.map((r) => r.slice());
  const v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0) as number));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[i][i] - a[j][j]);
  return { values: idx.map((i) => a[i][i]), vectors: idx.map((i) => v.map((row) => row[i])) };
}

/** Vetor x (|x| = 1) que minimiza |A x| — menor autovetor de AᵀA. */
export function nullVector(A: number[][]): number[] {
  const n = A[0].length;
  const M = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const r of A) for (let i = 0; i < n; i++) for (let j = i; j < n; j++) M[i][j] += r[i] * r[j];
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i];
  return eigSym(M).vectors[0];
}

/** SVD 3x3: A = U·diag(s)·Vᵀ, s decrescente. U e V com colunas ortonormais (det pode ser −1). */
export function svd3(A: M3): { U: M3; s: V3; V: M3 } {
  const AtA = mul3(T3(A), A);
  const { values, vectors } = eigSym([AtA.slice(0, 3), AtA.slice(3, 6), AtA.slice(6, 9)]);
  const vs = [vectors[2], vectors[1], vectors[0]];
  const s = [values[2], values[1], values[0]].map((x) => Math.sqrt(Math.max(0, x))) as V3;
  const us: V3[] = [];
  for (let i = 0; i < 3; i++) {
    const u = mulV(A, vs[i]);
    if (s[i] > 1e-10 * Math.max(1, s[0])) us.push(scale(u, 1 / s[i]));
    else us.push(i === 2 ? cross(us[0], us[1]) : normalize(cross(us[0] ?? [1, 0, 0], [0, 0, 1])));
  }
  const U: M3 = [us[0][0], us[1][0], us[2][0], us[0][1], us[1][1], us[2][1], us[0][2], us[1][2], us[2][2]];
  const V: M3 = [vs[0][0], vs[1][0], vs[2][0], vs[0][1], vs[1][1], vs[2][1], vs[0][2], vs[1][2], vs[2][2]];
  return { U, s, V };
}

/** Resolve A x = b (Gauss com pivô parcial). null se singular. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Gerador pseudoaleatório determinístico (mulberry32) para RANSAC reproduzível. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** k índices distintos em [0, n). */
export function sample(n: number, k: number, rand: () => number): number[] {
  const out: number[] = [];
  while (out.length < k) {
    const i = Math.floor(rand() * n);
    if (!out.includes(i)) out.push(i);
  }
  return out;
}

export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

