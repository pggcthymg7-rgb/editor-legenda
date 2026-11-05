// Validação de projeto recebido (servidor). Sem dependência externa.
import { isFontKey } from './fonts';
import { ENTRANCES, EXITS, type Project } from './types';

export const LOCAL_SRC = /^local:[a-zA-Z0-9_-]{1,64}$/;

type Result = { ok: true; project: Project } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min = -1e9, max = 1e9) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max = 500) => typeof v === 'string' && v.length <= max;

// Cor vira CSS inline: só #hex, rgb()/rgba()/hsl()/hsla() com números, ou nome simples (sem \\, ; ou parênteses soltos).
const COLOR = /^(#[0-9a-fA-F]{3,8}|(rgba?|hsla?)\(\s*-?[\d.]+%?(\s*[,\s/]\s*-?[\d.]+%?){2,3}\s*\)|[a-zA-Z]{3,20})$/;
const color = (v: unknown) => typeof v === 'string' && v.length <= 64 && COLOR.test(v);
const ROLES = ['small', 'normal', 'key'] as const;
const LAYOUTS = ['stack', 'inline', 'arc'];
const ALIGNS = ['left', 'center', 'right'];
const MODES = ['word', 'phrase', 'single'];

/** Valida um TextStyle parcial (campos ausentes são ok; presentes têm de ter o tipo certo). Devolve o erro ou null. */
function styleError(s: unknown, full = false): string | null {
  if (!isObj(s)) return 'estilo inválido';
  const has = (k: string) => s[k] !== undefined;
  const need = (k: string) => full && !has(k);
  for (const k of ['fontFamily', 'fontWeight', 'italic', 'fontSize', 'fill', 'letterSpacing', 'uppercase', 'opacity', 'glow', 'shadow', 'stroke']) {
    if (need(k)) return `estilo.${k} ausente`;
  }
  if (has('fontWeight') && !num(s.fontWeight, 100, 1000)) return 'estilo.fontWeight inválido';
  if (has('fontSize') && !num(s.fontSize, 1, 2000)) return 'estilo.fontSize inválido';
  if (has('letterSpacing') && !num(s.letterSpacing, -2, 5)) return 'estilo.letterSpacing inválido';
  if (has('opacity') && !num(s.opacity, 0, 1)) return 'estilo.opacity inválido';
  for (const k of ['italic', 'uppercase']) if (has(k) && typeof s[k] !== 'boolean') return `estilo.${k} inválido`;
  if (has('fill')) {
    const f = s.fill;
    if (!isObj(f)) return 'estilo.fill inválido';
    if (f.type === 'solid') {
      if (!color(f.color)) return 'cor inválida';
    } else if (f.type === 'gradient') {
      if (!Array.isArray(f.colors) || f.colors.length < 1 || f.colors.length > 16 || !f.colors.every(color)) return 'gradiente inválido';
      if (!num(f.angle, -3600, 3600)) return 'gradiente inválido';
    } else return 'estilo.fill inválido';
  }
  const fx: [string, string[]][] = [
    ['glow', ['blur']],
    ['shadow', ['blur', 'x', 'y']],
    ['stroke', ['width']],
    ['box', ['opacity', 'padX', 'padY', 'radius']],
  ];
  for (const [k, nums] of fx) {
    const o = s[k];
    if (o === undefined || o === null) continue;
    if (!isObj(o) || !color(o.color) || !nums.every((n) => num(o[n], -1e4, 1e4))) return `estilo.${k} inválido`;
  }
  return null;
}

function presetError(pr: unknown): string | null {
  if (!isObj(pr) || !str(pr.id, 120) || !str(pr.name, 200) || !str(pr.description, 1000)) return 'preset inválido';
  if (!isObj(pr.roles)) return 'preset.roles inválido';
  for (const r of ROLES) {
    const e = styleError(pr.roles[r], true);
    if (e) return `preset: ${e}`;
  }
  const a = pr.animation;
  if (!isObj(a) || !(ENTRANCES as readonly unknown[]).includes(a.entrance) || !(EXITS as readonly unknown[]).includes(a.exit) || !MODES.includes(a.mode as string)) return 'preset.animation inválido';
  if (!num(a.durationMs, 0, 60_000) || !num(a.staggerMs, 0, 60_000) || !num(a.holdMs, 0, 60_000)) return 'preset.animation inválido';
  if (!LAYOUTS.includes(pr.layout as string) || !ALIGNS.includes(pr.align as string)) return 'preset.layout inválido';
  if (!isObj(pr.position) || !num(pr.position.x, -10, 10) || !num(pr.position.y, -10, 10)) return 'preset.position inválido';
  if (!num(pr.lineGap, -10, 10) || typeof pr.counter !== 'boolean' || !Number.isInteger(pr.maxWords) || !num(pr.maxWords, 1, 200)) return 'preset inválido';
  if (pr.fitWidth !== undefined && typeof pr.fitWidth !== 'boolean') return 'preset inválido';
  return null;
}

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
  if (v.mask !== undefined) {
    const m = v.mask;
    if (!isObj(m) || !Number.isInteger(m.count) || !num(m.count, 1, 30 * 3600) || !num(m.fps, 1, 60) || !num(m.width, 8, 4096) || !num(m.height, 8, 4096)) {
      return fail('máscara inválida');
    }
  }
  if (p.occlusion !== undefined && typeof p.occlusion !== 'boolean') return fail('occlusion inválido');
  if (!Array.isArray(p.phrases) || p.phrases.length > 5000) return fail('frases inválidas');
  for (const ph of p.phrases) {
    if (!isObj(ph) || !str(ph.id, 120) || !str(ph.presetId, 120)) return fail('frase inválida');
    for (const k of ['x', 'y', 'scale', 'rotation', 'rotateX', 'rotateY'] as const) {
      if (!num(ph[k], -1e4, 1e4)) return fail(`frase.${k} inválido`);
    }
    if (!Array.isArray(ph.words) || ph.words.length > 200) return fail('palavras inválidas');
    for (const w of ph.words) {
      if (!isObj(w) || !str(w.id, 120) || !str(w.text, 200) || !num(w.startMs, 0) || !num(w.endMs, 0)) return fail('palavra inválida');
      if ((w.endMs as number) < (w.startMs as number)) return fail('palavra termina antes de começar');
      if (w.style !== undefined) {
        const e = styleError(w.style);
        if (e) return fail(`palavra: ${e}`);
      }
      if (!['small', 'normal', 'key'].includes(w.role as string)) return fail('papel inválido');
      for (const k of ['dx', 'dy', 'rotation'] as const) if (w[k] !== undefined && !num(w[k], -1e4, 1e4)) return fail(`palavra.${k} inválido`);
      for (const k of ['scaleX', 'scaleY'] as const) if (w[k] !== undefined && !num(w[k], 0.05, 20)) return fail(`palavra.${k} inválido`);
    }
    if (ph.behind !== undefined && typeof ph.behind !== 'boolean') return fail('behind inválido');
    if (ph.align !== undefined && !ALIGNS.includes(ph.align as string)) return fail('alinhamento inválido');
    if (ph.highlight !== undefined && ph.highlight !== null) {
      const e = styleError(ph.highlight);
      if (e) return fail(`destaque: ${e}`);
    }
    if (ph.roleStyles !== undefined) {
      if (!isObj(ph.roleStyles) || Object.keys(ph.roleStyles).some((k) => !(ROLES as readonly string[]).includes(k))) return fail('roleStyles inválido');
      for (const r of ROLES) {
        if (ph.roleStyles[r] === undefined) continue;
        const e = styleError(ph.roleStyles[r]);
        if (e) return fail(`frase: ${e}`);
      }
    }
    const a = ph.animation;
    if (a !== undefined) {
      if (!isObj(a)) return fail('animação inválida');
      if (a.entrance !== undefined && !(ENTRANCES as readonly unknown[]).includes(a.entrance)) return fail('entrada inválida');
      if (a.exit !== undefined && !(EXITS as readonly unknown[]).includes(a.exit)) return fail('saída inválida');
      if (a.mode !== undefined && !MODES.includes(a.mode as string)) return fail('modo de animação inválido');
      for (const k of ['durationMs', 'staggerMs', 'holdMs'] as const) {
        if (a[k] !== undefined && !num(a[k], 0, 60_000)) return fail(`animação.${k} inválido`);
      }
    }
  }
  if (!Array.isArray(p.customPresets) || p.customPresets.length > 200) return fail('presets inválidos');
  for (const pr of p.customPresets) {
    const e = presetError(pr);
    if (e) return fail(e);
  }
  // Fonte só da biblioteca (o nome vira CSS font-family).
  const fontBad = (o: unknown): boolean => {
    if (Array.isArray(o)) return o.some(fontBad);
    if (!isObj(o)) return false;
    if ('fontFamily' in o && !isFontKey(o.fontFamily)) return true;
    return Object.values(o).some(fontBad);
  };
  if (fontBad(p.phrases) || fontBad(p.customPresets)) return fail('fonte desconhecida');
  // Strings vão para CSS inline no render: bloqueia tentativas de fechar a declaração.
  const json = JSON.stringify(input);
  if (json.length > 15 * 1024 * 1024) return fail('projeto grande demais');
  if (/url\s*\(|expression\s*\(|<\/?script/i.test(json)) return fail('conteúdo não permitido');
  return { ok: true, project: input as unknown as Project };
}
