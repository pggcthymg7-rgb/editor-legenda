// Cliente do servidor local. Header x-editor é exigido pelo servidor (proteção CSRF).
import type { Project, TranscribedWord } from '../core/types';

const H = { 'x-editor': '1' };

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erro ${res.status}`);
  return body as T;
}

export const getStatus = () => fetch('/api/status').then((r) => json<{ openai: boolean; formats: Record<string, { label: string }> }>(r));

export function uploadVideo(file: File, onProgress: (p: number) => void): Promise<{ name: string; url: string }> {
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

export const transcribeOpenAi = (name: string) =>
  fetch('/api/transcribe/openai', {
    method: 'POST',
    headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then((r) => json<{ words: TranscribedWord[] }>(r));

export const startRender = (project: Project, format: string) =>
  fetch('/api/render', {
    method: 'POST',
    headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ project, format }),
  }).then((r) => json<{ id: string }>(r));

export const renderStatus = (id: string) =>
  fetch(`/api/render/${encodeURIComponent(id)}`).then((r) =>
    json<{ status: string; progress: number; error?: string; ready: boolean }>(r),
  );

export const downloadUrl = (id: string) => `/api/render/${encodeURIComponent(id)}/download`;

export const saveProject = (p: Project) =>
  fetch(`/api/projects/${encodeURIComponent(p.id)}`, {
    method: 'PUT',
    headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify(p),
  }).then((r) => json<{ ok: boolean }>(r));

export const listProjects = () => fetch('/api/projects').then((r) => json<{ id: string; name: string }[]>(r));
export const loadProject = (id: string) => fetch(`/api/projects/${encodeURIComponent(id)}`).then((r) => json<Project>(r));
