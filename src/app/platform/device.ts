// Aparelho (PWA no iPhone): nada sai do aparelho, exceto o áudio enviado à OpenAI quando o usuário escolhe.
import { newId } from '../../core/grouping';
import type { CompositionProps, Project } from '../../core/types';
import { LOCAL_SRC, validateProject } from '../../core/validate';
import { idbAll, idbDelete, idbDeletePrefix, idbGet, idbPut, idbPutMany } from './idb';
import { getKey, transcribeWithKey } from './openai-browser';
import { ALL_FORMATS, type FormatId, type FormatInfo, type Platform, type ProjectSummary } from './types';

type StoredProject = { project: Project; updatedAt: number };
type StoredVideo = { blob: Blob; name: string; type: string };

/** Configuração de cada formato no render do navegador. MOV ProRes não existe no navegador. */
export const DEVICE_FORMATS: Partial<
  Record<FormatId, { container: 'mp4' | 'webm'; videoCodec: 'h264' | 'vp9'; transparent: boolean; muted: boolean; background: CompositionProps['background'] }>
> = {
  'mp4-green': { container: 'mp4', videoCodec: 'h264', transparent: false, muted: true, background: 'green' },
  'mp4-final': { container: 'mp4', videoCodec: 'h264', transparent: false, muted: false, background: 'video' },
  'webm-alpha': { container: 'webm', videoCodec: 'vp9', transparent: true, muted: true, background: 'transparent' },
};

const urlCache = new Map<string, string>();
const maskCache = new Map<string, string[]>();
const revokeMasks = (src: string) => {
  maskCache.get(src)?.forEach((u) => URL.revokeObjectURL(u));
  maskCache.delete(src);
};
const revokeOther = (keepSrc: string) => {
  for (const [k, u] of urlCache) {
    if (k !== keepSrc) {
      URL.revokeObjectURL(u);
      urlCache.delete(k);
    }
  }
  for (const k of [...maskCache.keys()]) {
    if (k !== keepSrc) revokeMasks(k);
  }
};

export const devicePlatform: Platform = {
  kind: 'device',
  openAiReady: async () => Boolean(getKey()),

  async saveVideo(file, onProgress) {
    const id = newId('v');
    // pede ao Safari para não apagar os dados do app quando faltar espaço
    await navigator.storage?.persist?.().catch(() => false);
    onProgress(0);
    await idbPut('videos', id, { blob: file, name: file.name, type: file.type } satisfies StoredVideo);
    onProgress(1);
    return { src: `local:${id}`, ref: id };
  },

  async videoUrl(src) {
    if (!src) {
      revokeOther('');
      return '';
    }
    if (!LOCAL_SRC.test(src)) return src;
    revokeOther(src);
    const cached = urlCache.get(src);
    if (cached) return cached;
    const v = await idbGet<StoredVideo>('videos', src.slice('local:'.length));
    if (!v) throw new Error('Vídeo não encontrado neste aparelho');
    const url = URL.createObjectURL(v.blob);
    urlCache.set(src, url);
    return url;
  },

  async transcribeOpenAi(ref, onStatus, lang = 'pt') {
    const key = getKey();
    if (!key) throw new Error('Coloque sua chave da OpenAI nas configurações');
    const v = await idbGet<StoredVideo>('videos', ref);
    if (!v) throw new Error('Vídeo não encontrado neste aparelho');
    onStatus('Separando o áudio…');
    const { extractAudio } = await import('./audio');
    const audio = await extractAudio(v.blob, (p) => onStatus('Separando o áudio…', p));
    onStatus('Transcrevendo na OpenAI…');
    return transcribeWithKey(key, audio, 'audio.m4a', fetch, lang);
  },

  async transcribeCloud(ref, onStatus, lang = 'pt') {
    const v = await idbGet<StoredVideo>('videos', ref);
    if (!v) throw new Error('Vídeo não encontrado neste aparelho');
    const [{ extractAudio }, { cloudTranscribe }] = await Promise.all([import('./audio'), import('../cloud')]);
    onStatus('Separando o áudio…', 0);
    const audio = await extractAudio(v.blob, (p) => onStatus('Separando o áudio…', p));
    onStatus('Transcrevendo na nuvem…');
    return cloudTranscribe(audio, lang);
  },

  async listProjects() {
    const all = await idbAll<StoredProject>('projects');
    return all
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s): ProjectSummary => ({ id: s.project.id, name: s.project.name }));
  },

  async loadProject(id) {
    const s = await idbGet<StoredProject>('projects', id);
    if (!s) throw new Error('Projeto não encontrado');
    const v = validateProject(s.project);
    if (!v.ok) throw new Error(v.error);
    return v.project;
  },

  async saveProject(p) {
    const v = validateProject(p);
    if (!v.ok) throw new Error(v.error);
    await idbPut('projects', p.id, { project: p, updatedAt: Date.now() } satisfies StoredProject);
  },

  async deleteProject(id) {
    const s = await idbGet<StoredProject>('projects', id);
    const src = s?.project.video.src ?? '';
    await idbDelete('projects', id);
    if (LOCAL_SRC.test(src)) {
      // apaga o vídeo só se nenhum outro projeto usa
      const others = await idbAll<StoredProject>('projects');
      if (!others.some((o) => o.project.video.src === src)) {
        await idbDelete('videos', src.slice('local:'.length));
        await idbDeletePrefix('masks', `${src.slice('local:'.length)}:`);
        revokeMasks(src);
      }
      const u = urlCache.get(src);
      if (u) URL.revokeObjectURL(u);
      urlCache.delete(src);
    }
  },

  async saveMasks(src, frames, onProgress) {
    if (!LOCAL_SRC.test(src)) throw new Error('vídeo inválido');
    const id = src.slice('local:'.length);
    await idbDeletePrefix('masks', `${id}:`);
    revokeMasks(src);
    const CHUNK = 200;
    for (let i = 0; i < frames.length; i += CHUNK) {
      await idbPutMany(
        'masks',
        frames.slice(i, i + CHUNK).map((b, j) => [`${id}:${String(i + j).padStart(6, '0')}`, b]),
      );
      onProgress(Math.min(1, (i + CHUNK) / frames.length));
    }
  },

  async maskUrls(src, count) {
    if (!LOCAL_SRC.test(src)) return [];
    const cached = maskCache.get(src);
    if (cached && cached.length === count) return cached;
    revokeMasks(src);
    const id = src.slice('local:'.length);
    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      const b = await idbGet<Blob>('masks', `${id}:${String(i).padStart(6, '0')}`);
      if (!b) throw new Error('máscara faltando; refaça a análise');
      urls.push(URL.createObjectURL(b));
    }
    maskCache.set(src, urls);
    return urls;
  },

  async formats(width, height) {
    const { canRenderMediaOnWeb } = await import('@remotion/web-renderer');
    const out: FormatInfo[] = [];
    for (const f of ALL_FORMATS) {
      const cfg = DEVICE_FORMATS[f.id];
      if (!cfg) continue;
      const sc = deviceScale(width);
      const r = await canRenderMediaOnWeb({
        width,
        height,
        scale: sc,
        container: cfg.container,
        videoCodec: cfg.videoCodec,
        transparent: cfg.transparent,
        muted: cfg.muted,
      }).catch(() => null);
      if (r?.canRender) out.push(f);
    }
    return out;
  },

  async render(project, format, onProgress, signal, opts) {
    const cfg = DEVICE_FORMATS[format];
    if (!cfg) throw new Error('Formato indisponível no aparelho');
    const [{ renderMediaOnWeb }, { CaptionComposition }, { COMPOSITION_ID, FPS }] = await Promise.all([
      import('@remotion/web-renderer'),
      import('../../remotion/CaptionComposition'),
      import('../../remotion/Root'),
    ]);
    const { width, height, durationMs } = project.video;
    const layer = opts?.layer ?? 'captions';
    const inputProps: CompositionProps & Record<string, unknown> = {
      project,
      // camada da pessoa: fundo transparente/verde com só a pessoa recortada
      background: layer === 'person' && cfg.background === 'video' ? 'transparent' : cfg.background,
      maskUrls: opts?.maskUrls,
      layer,
    };
    const component: React.FC<CompositionProps & Record<string, unknown>> = CaptionComposition;
    const result = await renderMediaOnWeb({
      composition: {
        component,
        defaultProps: inputProps,
        id: COMPOSITION_ID,
        width,
        height,
        fps: FPS,
        durationInFrames: Math.max(1, Math.ceil((durationMs / 1000) * FPS)),
      },
      inputProps,
      container: cfg.container,
      videoCodec: cfg.videoCodec,
      transparent: cfg.transparent,
      muted: cfg.muted,
      videoBitrate: 'high',
      // vídeo 4K do iPhone: exporta em até 1080 de largura (memória e tempo); legenda escala junto
      scale: deviceScale(width),
      signal: signal ?? null,
      onProgress: (p) => onProgress(p.progress),
    });
    const blob = await result.getBlob();
    const ext = ALL_FORMATS.find((f) => f.id === format)?.ext ?? cfg.container;
    const file = new File([blob], `${safeName(project.name)}-${layer === 'person' ? 'pessoa-' : ''}${format}.${ext}`, { type: blob.type || `video/${cfg.container}` });
    return { url: URL.createObjectURL(file), file };
  },
};

/** Fator para exportar no máximo 1080 px de largura (par, exigido pelo H.264). */
export const deviceScale = (width: number) => {
  if (width <= 1080) return 1;
  const w = Math.floor(1080 / 2) * 2;
  return w / width;
};

export const safeName = (n: string) => n.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'legendas';
