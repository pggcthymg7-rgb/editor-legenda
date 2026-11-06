// Modelo serializável do rastreio 3D (vai no projeto) + suavização (one-euro) + âncora com perspectiva.
// Tudo puro: roda no worker, na composição Remotion e nos testes.
import { type Pose, ransacPlane } from './geometry';
import { type M3, type V3, T3, cross, dot, matFromQuat, mulV, norm, normalize, quatFromMat, scale, sub, add } from './math';
import type { Camera } from './sfm';

/** Pose compacta: quaternion (w,x,y,z) + translação. Mundo → câmera. */
export type PoseKey = { q: [number, number, number, number]; t: V3 };

/** Resultado do "Analisar" guardado em `project.video.track3d` (coordenadas em px da resolução de análise). */
export type Track3D = {
  fps: number;
  width: number;
  height: number;
  cam: Camera;
  /** tempo (ms) do quadro 0 da análise em relação ao início do vídeo */
  startMs: number;
  poses: PoseKey[];
  /** nuvem de pontos 3D estáticos da cena (amostra) */
  points: V3[];
  /** erro médio de reprojeção (px de análise) */
  err: number;
};

/** Âncora de uma frase: plano no mundo. Ponto local (a,b) em px da composição → origin + a·ex + b·ey. */
export type Anchor3D = { origin: V3; ex: V3; ey: V3; compW: number; kind?: SurfaceKind };
/** Superfície onde a âncora ficou: parede (vertical), chão, teto, ou plano de frente para a câmera. */
export type SurfaceKind = 'parede' | 'chao' | 'teto' | 'frente';
export type AnchorMode = 'auto' | 'frente';

const r5 = (v: number) => Math.round(v * 1e5) / 1e5;

export function packPose(P: Pose): PoseKey {
  const q = quatFromMat(P.R);
  return { q: q.map(r5) as PoseKey['q'], t: P.t.map(r5) as V3 };
}

export const unpackPose = (k: PoseKey): Pose => ({ R: matFromQuat(k.q), t: [...k.t] as V3 });

// ---------- suavização one-euro (sobre centro da câmera e quaternion) ----------
class OneEuro {
  private x: number | null = null;
  private dx = 0;
  constructor(
    private readonly rate: number,
    private readonly minCut: number,
    private readonly beta: number,
  ) {}
  private a(cut: number) {
    const tau = 1 / (2 * Math.PI * cut);
    return 1 / (1 + tau * this.rate);
  }
  next(v: number): number {
    if (this.x === null) return (this.x = v);
    const d = (v - this.x) * this.rate;
    this.dx += this.a(1) * (d - this.dx);
    const cut = this.minCut + this.beta * Math.abs(this.dx);
    return (this.x += this.a(cut) * (v - this.x));
  }
}

/**
 * Remove o tremor da trajetória. Passa duas vezes (frente e trás) e tira a média: sem atraso de fase,
 * importante para a palavra não "atrasar" em relação à parede.
 */
export function smoothPoses(poses: Pose[], fps: number, minCut = 2.5, beta = 0.4): Pose[] {
  const n = poses.length;
  if (n < 3) return poses;
  const C = poses.map((P) => scale(mulV(T3(P.R), P.t), -1));
  const Q = poses.map((P) => quatFromMat(P.R));
  for (let i = 1; i < n; i++) if (Q[i].reduce((s, v, j) => s + v * Q[i - 1][j], 0) < 0) Q[i] = Q[i].map((v) => -v) as typeof Q[number];
  const run = (series: number[][], dim: number) => {
    const fw = series.map(() => new Array(dim).fill(0));
    const bw = series.map(() => new Array(dim).fill(0));
    for (let d = 0; d < dim; d++) {
      const f1 = new OneEuro(fps, minCut, beta);
      const f2 = new OneEuro(fps, minCut, beta);
      for (let i = 0; i < n; i++) fw[i][d] = f1.next(series[i][d]);
      for (let i = n - 1; i >= 0; i--) bw[i][d] = f2.next(series[i][d]);
    }
    return series.map((_, i) => fw[i].map((v, d) => (v + bw[i][d]) / 2));
  };
  const Cs = run(C, 3);
  const Qs = run(Q, 4);
  return poses.map((_, i) => {
    const q = Qs[i];
    const l = Math.hypot(...q) || 1;
    const R = matFromQuat(q.map((v) => v / l));
    return { R, t: scale(mulV(R, Cs[i]), -1) };
  });
}

/** Jitter: média da 2ª diferença do centro da câmera (unidades de cena por quadro²). */
export function jitter(poses: Pose[]): number {
  const C = poses.map((P) => scale(mulV(T3(P.R), P.t), -1));
  let s = 0;
  for (let i = 1; i < C.length - 1; i++) s += norm(add(sub(C[i + 1], C[i]), sub(C[i - 1], C[i])));
  return C.length > 2 ? s / (C.length - 2) : 0;
}

// ---------- pose por tempo ----------
function slerp(a: number[], b: number[], u: number): number[] {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb = d < 0 ? b.map((v) => -v) : b;
  d = Math.abs(d);
  if (d > 0.9995) {
    const q = a.map((v, i) => v + (bb[i] - v) * u);
    const l = Math.hypot(...q);
    return q.map((v) => v / l);
  }
  const th = Math.acos(d);
  const s = Math.sin(th);
  return a.map((v, i) => (Math.sin((1 - u) * th) * v + Math.sin(u * th) * bb[i]) / s);
}

export function poseAt(tr: Track3D, tMs: number): Pose | null {
  if (!tr.poses.length) return null;
  const f = ((tMs - tr.startMs) / 1000) * tr.fps;
  const i = Math.max(0, Math.min(tr.poses.length - 1, Math.floor(f)));
  const j = Math.min(tr.poses.length - 1, i + 1);
  const u = Math.max(0, Math.min(1, f - i));
  const a = tr.poses[i];
  const b = tr.poses[j];
  return { R: matFromQuat(slerp(a.q, b.q, u)), t: a.t.map((v, k) => v + (b.t[k] - v) * u) as V3 };
}

// ---------- âncora ----------
/**
 * Cria a âncora no ponto da tela (px da composição) e no instante `tMs`.
 * Ajusta um plano aos pontos 3D próximos (parede) e coloca o elemento nele com o tamanho que tem agora.
 */
export function makeAnchor(tr: Track3D, tMs: number, px: number, py: number, compW: number, compH: number, mode: AnchorMode = 'auto'): Anchor3D | null {
  const P = poseAt(tr, tMs);
  if (!P) return null;
  const k = tr.width / compW;
  const u = px * k;
  const v = py * (tr.height / compH);
  const { f, cx, cy } = tr.cam;
  const Rt = T3(P.R);
  const C = scale(mulV(Rt, P.t), -1);
  const ray = normalize(mulV(Rt, [(u - cx) / f, (v - cy) / f, 1]));
  // pontos visíveis perto do clique (raio crescente)
  const vis = tr.points
    .map((X) => {
      const c = add(mulV(P.R, X), P.t);
      return c[2] > 1e-3 ? { X, d: Math.hypot(f * (c[0] / c[2]) + cx - u, f * (c[1] / c[2]) + cy - v), z: c[2] } : null;
    })
    .filter((o): o is { X: V3; d: number; z: number } => !!o)
    .sort((a, b) => a.d - b.d);
  if (!vis.length) return null;
  const rad = tr.width * 0.25;
  let near = vis.filter((o) => o.d < rad);
  if (near.length < 12) near = vis.slice(0, Math.min(vis.length, 40));
  const zs = near.map((o) => o.z).sort((a, b) => a - b);
  const zMed = zs[zs.length >> 1];
  const camZ = mulV(Rt, [0, 0, 1]);
  let n: V3 = scale(camZ, -1);
  let p0: V3 = add(C, scale(camZ, zMed));
  let kind: SurfaceKind = 'frente';
  if (mode === 'auto' && near.length >= 8) {
    const pl = ransacPlane(
      near.map((o) => o.X),
      zMed * 0.03,
    );
    let found = pl && pl.inliers >= Math.max(6, near.length * 0.5) ? pl : null;
    if (!found) {
      // superfície lisa (sem pontos perto): usa os planos dominantes da cena (chão, paredes, teto)
      let rest = tr.points.slice();
      let bestLam = Infinity;
      for (let k = 0; k < 4 && rest.length >= 30; k++) {
        const g = ransacPlane(rest, zMed * 0.02, 200, 5 + k);
        if (!g || g.inliers < Math.max(25, rest.length * 0.08)) break;
        const gn = dot(g.n, camZ) > 0 ? scale(g.n, -1) : g.n;
        const den = dot(gn, ray);
        const lam = den !== 0 ? dot(gn, sub(g.p, C)) / den : -1;
        if (Math.abs(den) > 0.2 && lam > zMed * 0.2 && lam < zMed * 6 && lam < bestLam) {
          bestLam = lam;
          found = g;
        }
        rest = rest.filter((X) => Math.abs(dot(g.n, sub(X, g.p))) > zMed * 0.02);
      }
    }
    if (found) {
      n = dot(found.n, camZ) > 0 ? scale(found.n, -1) : found.n;
      p0 = found.p;
      // classifica pelo eixo "para baixo" da câmera no quadro da âncora
      const down = dot(n, mulV(Rt, [0, 1, 0]));
      kind = down > 0.7 ? 'teto' : down < -0.7 ? 'chao' : 'parede';
    }
  }
  const den = dot(n, ray);
  if (Math.abs(den) < 0.15) return null; // plano visto de quina: âncora instável
  const lam = dot(n, sub(p0, C)) / den;
  if (!(lam > 0)) return null;
  const origin = add(C, scale(ray, lam));
  // eixos no plano alinhados com a tela (x da câmera projetado)
  const camX = mulV(Rt, [1, 0, 0]);
  const e1 = normalize(sub(camX, scale(n, dot(camX, n))));
  const e2 = cross(n, e1);
  // tamanho: 1 px da composição agora = (profundidade / f) / k em unidades de cena
  const depth = add(mulV(P.R, origin), P.t)[2];
  const s = (depth / f) * k;
  // e2 deve apontar para baixo na tela (y da câmera)
  const camY = mulV(Rt, [0, 1, 0]);
  const ey = dot(e2, camY) < 0 ? scale(e2, -s) : scale(e2, s);
  return { kind, origin: origin.map(r5) as V3, ex: scale(e1, s).map((x) => Math.round(x * 1e8) / 1e8) as V3, ey: ey.map((x) => Math.round(x * 1e8) / 1e8) as V3, compW };
}

/** Homografia 3×3 (linha a linha) que leva (a,b,1) local → px da composição. null se atrás da câmera. */
export function anchorHomography(tr: Track3D, a: Anchor3D, tMs: number, compW: number, compH: number): M3 | null {
  const P = poseAt(tr, tMs);
  if (!P) return null;
  // a âncora foi criada numa composição de largura a.compW: reescala o local
  const ls = a.compW / compW;
  const { f, cx, cy } = tr.cam;
  const K = (c: V3): V3 => [f * c[0] + cx * c[2], f * c[1] + cy * c[2], c[2]];
  const c0 = K(add(mulV(P.R, a.origin), P.t));
  if (c0[2] <= 1e-4) return null;
  const c1 = K(scale(mulV(P.R, a.ex), ls));
  const c2 = K(scale(mulV(P.R, a.ey), ls));
  const sx = compW / tr.width;
  const sy = compH / tr.height;
  return [c1[0] * sx, c2[0] * sx, c0[0] * sx, c1[1] * sy, c2[1] * sy, c0[1] * sy, c1[2], c2[2], c0[2]];
}

/** CSS matrix3d (coluna a coluna) da homografia, com transform-origin 0 0. */
export function homographyCss(H: M3): string {
  const s = 1 / H[8];
  const h = H.map((v) => v * s);
  const m = [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, h[8]];
  return `matrix3d(${m.map((v) => +v.toPrecision(8)).join(',')})`;
}

export const _test = { OneEuro, slerp };

/** Projeta a nuvem 3D no instante `tMs` (px de análise) com profundidade normalizada 0..1 (perto→longe). */
export function projectCloud(tr: Track3D, tMs: number): { u: number; v: number; d: number }[] {
  const P = poseAt(tr, tMs);
  if (!P) return [];
  const { f, cx, cy } = tr.cam;
  const out: { u: number; v: number; z: number }[] = [];
  for (const X of tr.points) {
    const c = add(mulV(P.R, X), P.t);
    if (c[2] <= 1e-3) continue;
    const u = f * (c[0] / c[2]) + cx;
    const v = f * (c[1] / c[2]) + cy;
    if (u >= 0 && v >= 0 && u < tr.width && v < tr.height) out.push({ u, v, z: c[2] });
  }
  const zs = out.map((o) => o.z).sort((a, b) => a - b);
  const lo = zs[Math.floor(zs.length * 0.05)] ?? 0;
  const hi = zs[Math.floor(zs.length * 0.95)] ?? 1;
  return out.map((o) => ({ u: o.u, v: o.v, d: Math.max(0, Math.min(1, (o.z - lo) / (hi - lo || 1))) }));
}
