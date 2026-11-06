// Motor de rastreio 3D "Precisão (Mac)": COLMAP (SIFT + correspondência sequencial + bundle adjustment global).
// Mais lento que o motor do aparelho, porém o mais exato disponível: distorção de lente, focal e
// todas as poses/pontos otimizados juntos. Saída no mesmo formato Track3D do motor do celular.
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { newId } from '../src/core/grouping';
import { type Track3D, packPose, smoothPoses } from '../src/tracking3d/model';
import { type V3, T3, matFromQuat, mulV, quatFromMat, scale } from '../src/tracking3d/math';
import type { Pose } from '../src/tracking3d/geometry';

const execFileP = promisify(execFile);
const FPS = 24;
const SHORT = 720;

export type T3Job = { id: string; status: 'running' | 'done' | 'error'; progress: number; stage: string; result?: Track3D; error?: string; startedAt: number };
const jobs = new Map<string, T3Job>();
const MAX_JOBS = 50;
const JOB_TTL_MS = 30 * 60 * 1000;

export const getTrackJob = (id: string) => jobs.get(id);

/** Limpa jobs terminados com mais de 30 minutos ou descarta mais antigos se exceder o limite. */
export function pruneTrackJobs(now = Date.now()): void {
  for (const [id, j] of jobs) {
    if (j.status !== 'running' && now - j.startedAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
  while (jobs.size > MAX_JOBS) {
    const oldestKey = jobs.keys().next().value;
    if (oldestKey) jobs.delete(oldestKey);
  }
}

let colmapBin: string | null | undefined;
export async function colmapAvailable(): Promise<boolean> {
  if (colmapBin === undefined) {
    colmapBin = ['/opt/homebrew/bin/colmap', '/usr/local/bin/colmap'].find((p) => existsSync(p)) ?? null;
  }
  return !!colmapBin;
}

function run(cmd: string, args: string[], job: T3Job): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    const on = (b: Buffer) => {
      log = (log + b.toString()).slice(-20000);
    };
    p.stdout.on('data', on);
    p.stderr.on('data', on);
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(log) : reject(new Error(`${path.basename(cmd)} falhou (${code}): ${log.slice(-400)}`))));
    if (job.status !== 'running') p.kill();
  });
}

type Img = { name: string; frame: number; R: number[]; t: V3; obs: { x: number; y: number; pid: number }[] };

function parseModel(camTxt: string, imgTxt: string, ptTxt: string) {
  const camLine = camTxt.split('\n').find((l) => l && !l.startsWith('#'))!.trim().split(/\s+/);
  // SIMPLE_RADIAL: f cx cy k
  const cam = { model: camLine[1], w: +camLine[2], h: +camLine[3], f: +camLine[4], cx: +camLine[5], cy: +camLine[6], k: +(camLine[7] ?? 0) };
  const lines = imgTxt.split('\n').filter((l) => !l.startsWith('#'));
  const imgs: Img[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const a = lines[i].trim().split(/\s+/);
    if (a.length < 10) break;
    const q = a.slice(1, 5).map(Number);
    const o = lines[i + 1].trim().split(/\s+/).map(Number);
    const obs: Img['obs'] = [];
    for (let j = 0; j + 2 < o.length + 1; j += 3) if (o[j + 2] >= 0) obs.push({ x: o[j], y: o[j + 1], pid: o[j + 2] });
    imgs.push({ name: a[9], frame: parseInt(a[9], 10) - 1, R: matFromQuat(q), t: a.slice(5, 8).map(Number) as V3, obs });
  }
  const pts = new Map<number, { X: V3; err: number; n: number }>();
  for (const l of ptTxt.split('\n')) {
    if (!l || l.startsWith('#')) continue;
    const a = l.trim().split(/\s+/).map(Number);
    pts.set(a[0], { X: [a[1], a[2], a[3]], err: a[7], n: (a.length - 8) / 2 });
  }
  return { cam, imgs, pts };
}

/** Preenche quadros sem pose: interpola entre vizinhos (slerp no quaternion, linear no centro). */
function fillPoses(n: number, have: Map<number, Pose>): Pose[] {
  const keys = [...have.keys()].sort((a, b) => a - b);
  const C = (P: Pose) => scale(mulV(T3(P.R), P.t), -1);
  const out: Pose[] = [];
  for (let f = 0; f < n; f++) {
    const p = have.get(f);
    if (p) {
      out.push(p);
      continue;
    }
    const nx = keys.find((k) => k > f);
    const pv = [...keys].reverse().find((k) => k < f);
    if (pv === undefined || nx === undefined) {
      out.push(have.get(pv ?? nx!)!);
      continue;
    }
    const a = have.get(pv)!;
    const b = have.get(nx)!;
    const u = (f - pv) / (nx - pv);
    const qa = quatFromMat(a.R);
    let qb = quatFromMat(b.R);
    if (qa.reduce((s, v, i) => s + v * qb[i], 0) < 0) qb = qb.map((v) => -v) as typeof qb;
    const R = matFromQuat(qa.map((v, i) => v + (qb[i] - v) * u));
    const ca = C(a);
    const cb = C(b);
    const c = ca.map((v, i) => v + (cb[i] - v) * u) as V3;
    out.push({ R, t: scale(mulV(R, c), -1) });
  }
  return out;
}

export function startTrackJob(videoPath: string, durationMs: number): T3Job {
  pruneTrackJobs();
  const id = newId('t3');
  const job: T3Job = { id, status: 'running', progress: 0, stage: 'Extraindo quadros…', startedAt: Date.now() };
  jobs.set(id, job);
  void (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'colmap-'));
    try {
      if (!(await colmapAvailable())) throw new Error('COLMAP não instalado no Mac (brew install colmap)');
      const img = path.join(dir, 'img');
      await mkdir(img);
      const vf = `fps=${FPS},scale='if(gt(iw,ih),-2,${SHORT})':'if(gt(iw,ih),${SHORT},-2)'`;
      await run('ffmpeg', ['-v', 'error', '-i', videoPath, '-t', String(durationMs / 1000), '-vf', vf, '-q:v', '2', path.join(img, '%05d.jpg')], job);
      const n = (await readdir(img)).length;
      if (n < 10) throw new Error('Vídeo curto demais');
      const db = path.join(dir, 'db.db');
      job.stage = 'Detectando pontos (SIFT)…';
      job.progress = 0.1;
      await run(colmapBin!, ['feature_extractor', '--database_path', db, '--image_path', img, '--ImageReader.single_camera', '1', '--ImageReader.camera_model', 'SIMPLE_RADIAL', '--SiftExtraction.max_num_features', '6000', '--FeatureExtraction.use_gpu', '0'], job);
      job.stage = 'Ligando quadros vizinhos…';
      job.progress = 0.35;
      await run(colmapBin!, ['sequential_matcher', '--database_path', db, '--SequentialMatching.overlap', '20', '--FeatureMatching.use_gpu', '0'], job);
      job.stage = 'Reconstruindo a câmera (bundle adjustment)…';
      job.progress = 0.6;
      const sparse = path.join(dir, 'sparse');
      await mkdir(sparse);
      await run(colmapBin!, ['mapper', '--database_path', db, '--image_path', img, '--output_path', sparse, '--Mapper.ba_refine_principal_point', '0'], job);
      const models = await readdir(sparse);
      if (!models.length) throw new Error('Não deu para reconstruir: filme algo com textura e mova a câmera.');
      // maior modelo (mais quadros registrados)
      let bestM: ReturnType<typeof parseModel> | null = null;
      for (const m of models) {
        const txt = path.join(dir, `txt${m}`);
        await mkdir(txt);
        await run(colmapBin!, ['model_converter', '--input_path', path.join(sparse, m), '--output_path', txt, '--output_type', 'TXT'], job);
        const [c, i, p] = await Promise.all(['cameras.txt', 'images.txt', 'points3D.txt'].map((f) => readFile(path.join(txt, f), 'utf8')));
        const pm = parseModel(c, i, p);
        if (!bestM || pm.imgs.length > bestM.imgs.length) bestM = pm;
      }
      job.stage = 'Finalizando…';
      job.progress = 0.95;
      job.result = toTrack3D(bestM!, n);
      job.progress = 1;
      job.status = 'done';
    } catch (e) {
      job.status = 'error';
      job.error = (e as Error).message;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  })();
  return job;
}

export function toTrack3D(m: ReturnType<typeof parseModel>, n: number): Track3D {
  const have = new Map<number, Pose>();
  for (const im of m.imgs) have.set(im.frame, { R: im.R as Pose['R'], t: im.t });
  if (have.size < n * 0.5) throw new Error(`Só ${have.size}/${n} quadros reconstruídos: movimento rápido demais ou pouca textura.`);
  const poses = smoothPoses(fillPoses(n, have), FPS, 6, 0.6);
  // pontos bons: vistos em ≥3 quadros e erro < 2 px
  const good = [...m.pts.values()].filter((q) => q.n >= 3 && q.err < 2);
  good.sort((a, b) => b.n - a.n);
  const pts = good.slice(0, 4000).map((q) => q.X.map((v) => Math.round(v * 1e4) / 1e4) as V3);
  const err = good.length ? good.reduce((s, q) => s + q.err, 0) / good.length : 0;
  return {
    fps: FPS,
    width: m.cam.w,
    height: m.cam.h,
    cam: { f: Math.round(m.cam.f * 100) / 100, cx: m.cam.cx, cy: m.cam.cy },
    startMs: 0,
    poses: poses.map(packPose),
    points: pts,
    err: Math.round(err * 100) / 100,
  };
}

export const _test = { parseModel, fillPoses, execFileP, pruneTrackJobs, jobs };
