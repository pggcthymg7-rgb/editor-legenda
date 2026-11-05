// Validação de projeto recebido (servidor). Sem dependência externa.
import { ENTRANCES, EXITS, type Project } from './types';

export const LOCAL_SRC = /^local:[a-zA-Z0-9_-]{1,64}$/;

type Result = { ok: true; project: Project } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min = -1e9, max = 1e9) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max = 500) => typeof v === 'string' && v.length <= max;

export function validateProject(input: unknown): Result {
  const fail = (error: string): Result => ({ ok: false, error });
  if (!isObj(input)) return fail('projeto inválido');
  const p = input as Record<string, unknown>;
  if (p.version !== 1) return fail('versão inválida');
  if (!str(p.id, 120) || !str(p.name, 200)) return fail('id/nome inválido');
  const v = p.video;
  if (!isObj(v)) return fail('vídeo inválido');
  if (!str(v.src, 300)) return fail('src inválido');
  const src = v.src as string;
  // Mac: arquivo em /media. iPhone (PWA): vídeo guardado no aparelho, referência local:<id>.
  if (src && !/^\/media\/[a-zA-Z0-9_-]+\.(mp4|mov|m4v|webm)$/.test(src) && !LOCAL_SRC.test(src)) return fail('src fora de /media');
  if (!num(v.width, 16, 8192) || !num(v.height, 16, 8192)) return fail('dimensão inválida');
  if (!num(v.durationMs, 1, 4 * 3600 * 1000)) return fail('duração inválida');
  if (!Array.isArray(p.phrases) || p.phrases.length > 5000) return fail('frases inválidas');
  for (const ph of p.phrases) {
    if (!isObj(ph) || !str(ph.id, 120) || !str(ph.presetId, 120)) return fail('frase inválida');
    for (const k of ['x', 'y', 'scale', 'rotation', 'rotateX', 'rotateY'] as const) {
      if (!num(ph[k], -1e4, 1e4)) return fail(`frase.${k} inválido`);
    }
    if (!Array.isArray(ph.words) || ph.words.length > 200) return fail('palavras inválidas');
    for (const w of ph.words) {
      if (!isObj(w) || !str(w.text, 200) || !num(w.startMs, 0) || !num(w.endMs, 0)) return fail('palavra inválida');
      if (!['small', 'normal', 'key'].includes(w.role as string)) return fail('papel inválido');
    }
    const a = ph.animation;
    if (a !== undefined) {
      if (!isObj(a)) return fail('animação inválida');
      if (a.entrance !== undefined && !(ENTRANCES as readonly unknown[]).includes(a.entrance)) return fail('entrada inválida');
      if (a.exit !== undefined && !(EXITS as readonly unknown[]).includes(a.exit)) return fail('saída inválida');
    }
  }
  if (!Array.isArray(p.customPresets) || p.customPresets.length > 200) return fail('presets inválidos');
  // Strings vão para CSS inline no render: bloqueia tentativas de fechar a declaração.
  const json = JSON.stringify(input);
  if (json.length > 15 * 1024 * 1024) return fail('projeto grande demais');
  if (/url\s*\(|expression\s*\(|<\/?script/i.test(json)) return fail('conteúdo não permitido');
  return { ok: true, project: input as unknown as Project };
}
