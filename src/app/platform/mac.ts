// Mac: cliente do servidor local. Header x-editor é exigido pelo servidor (proteção CSRF).
import type { Project, TranscribedWord } from '../../core/types';
import { ALL_FORMATS, type FormatId, type Platform } from './types';

const H = { 'x-editor': '1' };

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erro ${res.status}`);
  return body as T;
}

const getStatus = () => fetch('/api/status').then((r) => json<{ openai: boolean }>(r));

function uploadVideo(file: File, onProgress: (p: number) => void): Promise<{ name: string; url: string }> {
  return new Promise((resolve, reject) => {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('x-editor', '1');
    xhr.setRequestHeader('x-file-ext', ext);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(body.error ?? 'falha no upload'));
        else resolve(body);
      } catch {
        reject(new Error('resposta inválida'));
      }
    };
    xhr.onerror = () => reject(new Error('servidor fora do ar'));
    xhr.send(file);
  });
}

const startRender = (project: Project, format: string) =>
  fetch('/api/render', {
    method: 'POST',
    headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ project, format }),
  }).then((r) => json<{ id: string }>(r));

const renderStatus = (id: string) =>
  fetch(`/api/render/${encodeURIComponent(id)}`).then((r) => json<{ status: string; progress: number; error?: string }>(r));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const macPlatform: Platform = {
  kind: 'mac',
  openAiReady: () => getStatus().then((s) => s.openai),
  async saveVideo(file, onProgress) {
    const up = await uploadVideo(file, onProgress);
    return { src: up.url, ref: up.name };
  },
  videoUrl: async (src) => src,
  async transcribeOpenAi(ref, onStatus) {
    onStatus('Transcrevendo na OpenAI…');
    const r = await fetch('/api/transcribe/openai', {
      method: 'POST',
      headers: { ...H, 'content-type': 'application/json' },
      body: JSON.stringify({ name: ref }),
    });
    return (await json<{ words: TranscribedWord[] }>(r)).words;
  },
  listProjects: () => fetch('/api/projects').then((r) => json<{ id: string; name: string }[]>(r)),
  loadProject: (id) => fetch(`/api/projects/${encodeURIComponent(id)}`).then((r) => json<Project>(r)),
  async saveProject(p) {
    await fetch(`/api/projects/${encodeURIComponent(p.id)}`, {
      method: 'PUT',
      headers: { ...H, 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }).then((r) => json<{ ok: boolean }>(r));
  },
  formats: async () => ALL_FORMATS,
  async render(project, format: FormatId, onProgress, signal) {
    const { id } = await startRender(project, format);
    for (;;) {
      if (signal?.aborted) throw new Error('cancelado');
      const s = await renderStatus(id);
      onProgress(s.progress);
      if (s.status === 'done') return { url: `/api/render/${encodeURIComponent(id)}/download` };
      if (s.status === 'error') throw new Error(s.error ?? 'falha no render');
      await wait(800);
    }
  },
};
