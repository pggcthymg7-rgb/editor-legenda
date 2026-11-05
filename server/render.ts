// Fila de render com Remotion (Node). Uma renderização por vez para não travar o Mac.
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, type RenderMediaOptions } from '@remotion/renderer';
import { randomUUID } from 'node:crypto';
import { rmSync, watch } from 'node:fs';
import path from 'node:path';
import type { CompositionProps, Project } from '../src/core/types';
import { OUT_DIR, inside } from './storage';

export const FORMATS = {
  'mov-alpha': { ext: 'mov', label: 'MOV ProRes 4444 transparente (Premiere / CapCut desktop)' },
  'webm-alpha': { ext: 'webm', label: 'WebM VP9 transparente' },
  'mp4-green': { ext: 'mp4', label: 'MP4 fundo verde (CapCut celular, chroma key)' },
  'mp4-final': { ext: 'mp4', label: 'MP4 final com vídeo e legenda' },
} as const;
export type FormatId = keyof typeof FORMATS;
export const isFormat = (f: unknown): f is FormatId => typeof f === 'string' && f in FORMATS;

type Job = {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  file?: string;
  error?: string;
  createdAt: number;
};

const jobs = new Map<string, Job>();
let bundlePromise: Promise<string> | null = null;
let chain: Promise<void> = Promise.resolve();

const ENTRY = path.resolve(process.cwd(), 'src/remotion/index.ts');

// Em desenvolvimento, mudou código da composição → refaz o pacote no próximo render.
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  watch(path.resolve(process.cwd(), 'src'), { recursive: true }, () => {
    bundlePromise = null;
  });
}

function getBundle(): Promise<string> {
  bundlePromise ??= bundle({ entryPoint: ENTRY }).catch((e) => {
    bundlePromise = null;
    throw e;
  });
  return bundlePromise;
}

function codecOptions(format: FormatId): Partial<RenderMediaOptions> & { background: CompositionProps['background'] } {
  switch (format) {
    case 'mov-alpha':
      return { codec: 'prores', proResProfile: '4444', imageFormat: 'png', pixelFormat: 'yuva444p10le', background: 'transparent' };
    case 'webm-alpha':
      return { codec: 'vp9', imageFormat: 'png', pixelFormat: 'yuva420p', background: 'transparent' };
    case 'mp4-green':
      return { codec: 'h264', imageFormat: 'jpeg', background: 'green' };
    case 'mp4-final':
      return { codec: 'h264', imageFormat: 'jpeg', background: 'video', crf: 18 };
  }
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/** Enfileira render. `mediaBaseUrl` torna o src do vídeo absoluto para o navegador do render. */
export function enqueueRender(project: Project, format: FormatId, mediaBaseUrl: string, layer: 'captions' | 'person' = 'captions'): Job {
  const job: Job = { id: randomUUID(), status: 'queued', progress: 0, createdAt: Date.now() };
  jobs.set(job.id, job);
  pruneJobs();
  chain = chain.then(() => runJob(job, project, format, mediaBaseUrl, layer)).catch(() => undefined);
  return job;
}

async function runJob(job: Job, project: Project, format: FormatId, mediaBaseUrl: string, layer: 'captions' | 'person') {
  job.status = 'rendering';
  try {
    const { background, ...opts } = codecOptions(format);
    const src = project.video.src && project.video.src.startsWith('/') ? mediaBaseUrl + project.video.src : project.video.src;
    // máscaras da pessoa: legenda atrás (se ligada) ou camada só da pessoa
    const mask = project.video.mask;
    const mediaId = /^\/media\/([a-zA-Z0-9_-]+)\./.exec(project.video.src)?.[1];
    const useMasks = mask && mediaId && (layer === 'person' || project.occlusion !== false);
    const maskUrls = useMasks ? Array.from({ length: mask.count }, (_, i) => `${mediaBaseUrl}/media/masks/${mediaId}/${i}.jpg`) : undefined;
    const inputProps: CompositionProps = {
      project: { ...project, video: { ...project.video, src } },
      background: layer === 'person' && background === 'video' ? 'transparent' : background,
      maskUrls,
      layer,
    };
    const serveUrl = await getBundle();
    const composition = await selectComposition({ serveUrl, id: 'Legendas', inputProps });
    const file = `${job.id}${layer === 'person' ? '-pessoa' : ''}.${FORMATS[format].ext}`;
    await renderMedia({
      ...opts,
      composition,
      serveUrl,
      inputProps,
      outputLocation: inside(OUT_DIR, file),
      // legenda transparente/verde não leva áudio; vídeo final leva
      muted: background !== 'video' || layer === 'person',
      onProgress: ({ progress }) => {
        job.progress = progress;
      },
    } as RenderMediaOptions);
    job.file = file;
    job.progress = 1;
    job.status = 'done';
  } catch (e) {
    job.status = 'error';
    job.error = e instanceof Error ? e.message.split('\n')[0] : String(e);
  }
}

/** Apaga renders com mais de 24 h. */
function pruneJobs() {
  const limit = Date.now() - 24 * 3600 * 1000;
  for (const [id, j] of jobs) {
    if (j.createdAt < limit) {
      if (j.file) rmSync(inside(OUT_DIR, j.file), { force: true });
      jobs.delete(id);
    }
  }
}
