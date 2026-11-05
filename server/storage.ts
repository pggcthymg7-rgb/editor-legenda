// Pastas de dados locais e validação de nomes (evita path traversal).
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(process.env.EDITOR_DATA_DIR ?? path.join(process.cwd(), 'data'));
export const MEDIA_DIR = path.join(ROOT, 'media');
export const OUT_DIR = path.join(ROOT, 'renders');
export const PROJECT_DIR = path.join(ROOT, 'projects');
export const MASK_DIR = path.join(MEDIA_DIR, 'masks');
for (const d of [MEDIA_DIR, OUT_DIR, PROJECT_DIR, MASK_DIR]) mkdirSync(d, { recursive: true });

const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;
export const ALLOWED_VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm']);

export const isSafeId = (id: unknown): id is string => typeof id === 'string' && SAFE_ID.test(id);

/** Nome de arquivo de mídia "id.ext" validado; null se inválido. */
export function safeMediaName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const ext = path.extname(name).toLowerCase();
  const id = name.slice(0, -ext.length);
  if (!ALLOWED_VIDEO_EXT.has(ext) || !isSafeId(id)) return null;
  return id + ext;
}

/** Resolve caminho dentro de base; lança erro se escapar. */
export function inside(base: string, name: string): string {
  const p = path.resolve(base, name);
  if (!p.startsWith(base + path.sep)) throw new Error('caminho inválido');
  return p;
}
