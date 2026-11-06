import { describe, expect, it } from 'vitest';
import { type Pose } from '../src/tracking3d/geometry';
import { type V3, rng, rodrigues } from '../src/tracking3d/math';
import { type Camera, type Track, projectPx, reconstruct } from '../src/tracking3d/sfm';

// Cena sintética: câmera em travelling + pontos 3D → trilhas com ruído (px).
function synth(opts: { planar: boolean; n: number; frames: number; noise: number; seed?: number }) {
  const rand = rng(opts.seed ?? 5);
  const cam: Camera = { f: 480, cx: 180, cy: 320 };
  const X: V3[] = Array.from({ length: opts.n }, () =>
    opts.planar ? [(rand() - 0.5) * 6, (rand() - 0.5) * 8, 4 + 0.15 * (rand() - 0.5) * 0] : [(rand() - 0.5) * 6, (rand() - 0.5) * 8, 3 + rand() * 4],
  );
  const poses: Pose[] = Array.from({ length: opts.frames }, (_, f) => {
    const s = f / (opts.frames - 1);
    const R = rodrigues([0.02 * Math.sin(s * 3), 0.08 * s, 0.01 * s]);
    const C: V3 = [-0.8 + 1.6 * s, 0.1 * Math.sin(s * 4), 0.2 * s];
    // t = −R·C
    const t: V3 = [-(R[0] * C[0] + R[1] * C[1] + R[2] * C[2]), -(R[3] * C[0] + R[4] * C[1] + R[5] * C[2]), -(R[6] * C[0] + R[7] * C[1] + R[8] * C[2])];
    return { R, t };
  });
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const tracks: Track[] = [];
  X.forEach((P) => {
    let cur: Track | null = null;
    for (let f = 0; f < opts.frames; f++) {
      const p = projectPx(poses[f], P, cam);
      const inside = p && p[0] > 0 && p[0] < 360 && p[1] > 0 && p[1] < 640;
      if (inside) {
        if (!cur) {
          cur = { start: f, xs: [], ys: [] };
          tracks.push(cur);
        }
        cur.xs.push(p![0] + gauss() * opts.noise);
        cur.ys.push(p![1] + gauss() * opts.noise);
      } else cur = null;
    }
  });
  return { cam, X, poses, tracks };
}

/** Deriva da âncora: ponto 3D estimado de uma trilha vs. projeção verdadeira, em todos os quadros. */
function anchorDrift(s: ReturnType<typeof synth>, r: NonNullable<ReturnType<typeof reconstruct>>) {
  let worst = 0;
  r.pointTracks.slice(0, 40).forEach((ti, j) => {
    for (let f = 0; f < s.poses.length; f += 5) {
      const est = projectPx(r.poses[f], r.points[j], s.cam);
      const tr = s.tracks[ti];
      if (!est || f < tr.start || f >= tr.start + tr.xs.length) continue;
      worst = Math.max(worst, Math.hypot(est[0] - tr.xs[f - tr.start], est[1] - tr.ys[f - tr.start]));
    }
  });
  return worst;
}

describe('tracking3d: reconstrução (SfM)', () => {
  it('cena 3D genérica: erro de reprojeção < 1 px', () => {
    const s = synth({ planar: false, n: 300, frames: 120, noise: 0.5 });
    const r = reconstruct(s.tracks, 120, s.cam);
    expect(r).not.toBeNull();
    expect(r!.tracked).toBe(120);
    expect(r!.err).toBeLessThan(1);
    expect(anchorDrift(s, r!)).toBeLessThan(4);
  });

  it('parede plana em travelling (homografia no início): erro < 1 px e sem deslizar', () => {
    const s = synth({ planar: true, n: 300, frames: 150, noise: 0.5, seed: 9 });
    const r = reconstruct(s.tracks, 150, s.cam);
    expect(r).not.toBeNull();
    expect(r!.tracked).toBe(150);
    expect(r!.err).toBeLessThan(1);
    expect(anchorDrift(s, r!)).toBeLessThan(4);
  });
});

// ---------- vídeo sintético: parede texturizada filmada em travelling ----------
function texture(x: number, y: number): number {
  // ruído de valor em 3 escalas (padrão com cantos rastreáveis)
  const h = (i: number, j: number) => {
    let n = (i * 374761393 + j * 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const vn = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    return (1 - sy) * ((1 - sx) * h(i, j) + sx * h(i + 1, j)) + sy * ((1 - sx) * h(i, j + 1) + sx * h(i + 1, j + 1));
  };
  return 255 * Math.min(1, Math.max(0, 0.55 * vn(x * 6, y * 6) + 0.3 * vn(x * 14, y * 14) + 0.25 * vn(x * 2, y * 2) - 0.05));
}

function renderWall(P: Pose, cam: Camera, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const R = P.R;
  // centro C = −Rᵀ t
  const C = [0, 1, 2].map((k) => -(R[k] * P.t[0] + R[3 + k] * P.t[1] + R[6 + k] * P.t[2]));
  for (let v = 0; v < h; v++)
    for (let u = 0; u < w; u++) {
      const dc = [(u - cam.cx) / cam.f, (v - cam.cy) / cam.f, 1];
      const d = [0, 1, 2].map((k) => R[k] * dc[0] + R[3 + k] * dc[1] + R[6 + k] * dc[2]);
      const lam = (4 - C[2]) / d[2];
      out[v * w + u] = texture(C[0] + lam * d[0], C[1] + lam * d[1]);
    }
  return out;
}

describe('tracking3d: vídeo sintético ponta a ponta (KLT + SfM)', () => {
  it('palavra grudada na parede não desliza durante o travelling', async () => {
    const { FeatureTracker } = await import('../src/tracking3d/features');
    const w = 180;
    const h = 320;
    const cam: Camera = { f: 240, cx: 90, cy: 160 };
    const n = 60;
    const poses: Pose[] = Array.from({ length: n }, (_, f) => {
      const s = f / (n - 1);
      const R = rodrigues([0.01 * Math.sin(3 * s), 0.06 * s, 0]);
      const C: V3 = [-0.6 + 1.2 * s, 0.05 * Math.sin(5 * s), 0.1 * s];
      return { R, t: [0, 1, 2].map((k) => -(R[k * 3] * C[0] + R[k * 3 + 1] * C[1] + R[k * 3 + 2] * C[2])) as V3 };
    });
    const tr = new FeatureTracker(w, h, { maxPoints: 250 });
    for (const P of poses) tr.push(renderWall(P, cam, w, h));
    const tracks = tr.result(3);
    const r = reconstruct(tracks, n, cam);
    expect(r).not.toBeNull();
    expect(r!.tracked).toBe(n);
    expect(r!.err).toBeLessThan(1);
    // âncora: ponto 3D estimado perto do centro; GT = mesmo raio no quadro 0 cortando a parede real
    let best = 0;
    let bd = Infinity;
    r!.points.forEach((X, j) => {
      const p = projectPx(r!.poses[0], X, cam);
      if (p && Math.hypot(p[0] - 90, p[1] - 160) < bd) {
        bd = Math.hypot(p[0] - 90, p[1] - 160);
        best = j;
      }
    });
    const p0 = projectPx(r!.poses[0], r!.points[best], cam)!;
    const P0 = poses[0];
    const C0 = [0, 1, 2].map((k) => -(P0.R[k] * P0.t[0] + P0.R[3 + k] * P0.t[1] + P0.R[6 + k] * P0.t[2]));
    const dc = [(p0[0] - cam.cx) / cam.f, (p0[1] - cam.cy) / cam.f, 1];
    const d = [0, 1, 2].map((k) => P0.R[k] * dc[0] + P0.R[3 + k] * dc[1] + P0.R[6 + k] * dc[2]);
    const lam = (4 - C0[2]) / d[2];
    const G: V3 = [C0[0] + lam * d[0], C0[1] + lam * d[1], 4];
    let worst = 0;
    for (let f = 0; f < n; f++) {
      const e = projectPx(r!.poses[f], r!.points[best], cam);
      const g = projectPx(poses[f], G, cam);
      if (e && g) worst = Math.max(worst, Math.hypot(e[0] - g[0], e[1] - g[1]));
    }
    expect(worst).toBeLessThan(1.5);
  }, 30_000);
});

// ---------- modelo: suavização, âncora com perspectiva, validação ----------
describe('tracking3d: âncora 3D e suavização', () => {
  it('suavização reduz o jitter e mantém a trajetória', async () => {
    const { smoothPoses, jitter } = await import('../src/tracking3d/model');
    const rand = rng(3);
    const truth: Pose[] = Array.from({ length: 120 }, (_, f) => ({ R: rodrigues([0, 0.002 * f, 0]), t: [-0.01 * f, 0, 0] as V3 }));
    const noisy = truth.map((P) => ({ R: rodrigues([0, 0.002 * truth.indexOf(P) + (rand() - 0.5) * 0.004, 0]), t: P.t.map((v) => v + (rand() - 0.5) * 0.01) as V3 }));
    const sm = smoothPoses(noisy, 24);
    expect(jitter(sm)).toBeLessThan(jitter(noisy) * 0.3);
    const dev = Math.max(...sm.map((P, i) => Math.hypot(...P.t.map((v, k) => v - truth[i].t[k]))));
    expect(dev).toBeLessThan(0.02);
  });

  it('frase grudada na parede: cantos da homografia seguem a parede real (< 2 px)', async () => {
    const { makeAnchor, anchorHomography, packPose } = await import('../src/tracking3d/model');
    const s = synth({ planar: true, n: 300, frames: 150, noise: 0.5, seed: 9 });
    const r = reconstruct(s.tracks, 150, s.cam)!;
    const tr = { fps: 30, width: 360, height: 640, cam: s.cam, startMs: 0, poses: r.poses.map(packPose), points: r.points, err: r.err };
    // composição 1080×1920 (3× a análise); âncora no centro no quadro 0
    const a = makeAnchor(tr, 0, 540, 960, 1080, 1920)!;
    expect(a).not.toBeNull();
    // GT: interseção do raio pelo centro (quadro 0) com a parede z=4, e cantos a ±100 px de composição
    const H0 = anchorHomography(tr, a, 0, 1080, 1920)!;
    const ap = (H: number[], x: number, y: number) => {
      const w = H[6] * x + H[7] * y + H[8];
      return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
    };
    expect(Math.hypot(ap(H0, 0, 0)[0] - 540, ap(H0, 0, 0)[1] - 960)).toBeLessThan(0.5);
    // para cada canto: raio no quadro 0 → parede verdadeira → projeção verdadeira em cada quadro
    const P0 = s.poses[0];
    const Rt = (R: number[], v: number[]) => [0, 1, 2].map((k) => R[k] * v[0] + R[3 + k] * v[1] + R[6 + k] * v[2]);
    const C0 = Rt(P0.R, P0.t).map((v) => -v);
    const gt = [[-100, -40], [100, -40], [100, 40], [-100, 40]].map(([x, y]) => {
      const [u, v] = ap(H0, x, y);
      const d = Rt(P0.R, [(u / 3 - s.cam.cx) / s.cam.f, (v / 3 - s.cam.cy) / s.cam.f, 1]);
      const lam = (4 - C0[2]) / d[2];
      return { x, y, G: [C0[0] + lam * d[0], C0[1] + lam * d[1], 4] as V3 };
    });
    let worst = 0;
    for (let f = 0; f < 150; f += 3) {
      const H = anchorHomography(tr, a, (f / 30) * 1000, 1080, 1920)!;
      for (const c of gt) {
        const e = ap(H, c.x, c.y);
        const g = projectPx(s.poses[f], c.G, s.cam)!;
        worst = Math.max(worst, Math.hypot(e[0] / 3 - g[0], e[1] / 3 - g[1]));
      }
    }
    expect(worst).toBeLessThan(2);
  });

  it('validação aceita rastreio/âncora válidos e recusa lixo', async () => {
    const { validateProject } = await import('../src/core/validate');
    const base = {
      version: 1, id: 'x', name: 'x', customPresets: [],
      video: { src: '/media/a.mp4', width: 1080, height: 1920, durationMs: 1000, fps: 30,
        track3d: { fps: 24, width: 360, height: 640, cam: { f: 400, cx: 180, cy: 320 }, startMs: 0, err: 0.7, poses: [{ q: [1, 0, 0, 0], t: [0, 0, 0] }], points: [[0, 0, 1]] } },
      phrases: [{ id: 'p', presetId: 'p1-editorial', x: 0.5, y: 0.5, scale: 1, rotation: 0, rotateX: 0, rotateY: 0, words: [{ id: 'w', text: 'oi', startMs: 0, endMs: 500, role: 'normal' }],
        anchor3d: { origin: [0, 0, 1], ex: [0.001, 0, 0], ey: [0, 0.001, 0], compW: 1080 } }],
    };
    expect(validateProject(base).ok).toBe(true);
    const bad = structuredClone(base) as typeof base;
    (bad.video.track3d.poses[0] as unknown as { q: unknown }).q = ['x'];
    expect(validateProject(bad).ok).toBe(false);
    const bad2 = structuredClone(base) as typeof base;
    (bad2.phrases[0].anchor3d as unknown as { ex: unknown }).ex = 'url(x)';
    expect(validateProject(bad2).ok).toBe(false);
  });
});
