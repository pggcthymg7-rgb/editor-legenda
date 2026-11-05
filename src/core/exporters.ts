// Export de texto: SRT (só texto e tempo) e ASS (fonte, cor, posição, quebra de linha).
import { computeLines } from './layout';
import { findPreset, resolveWordStyle } from './presets';
import { phraseEnd, phraseStart } from './grouping';
import { fontName } from './fonts';
import type { Project, TextStyle } from './types';


const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

export function srtTime(ms: number): string {
  const t = Math.max(0, Math.round(ms));
  return `${pad(t / 3600000)}:${pad((t / 60000) % 60)}:${pad((t / 1000) % 60)},${pad(t % 1000, 3)}`;
}

export function assTime(ms: number): string {
  const t = Math.max(0, Math.round(ms / 10)); // centésimos
  return `${Math.floor(t / 360000)}:${pad((t / 6000) % 60)}:${pad((t / 100) % 60)}.${pad(t % 100)}`;
}

export function toSrt(project: Project): string {
  return project.phrases
    .filter((p) => p.words.length)
    .map((p, i) => `${i + 1}\n${srtTime(phraseStart(p))} --> ${srtTime(phraseEnd(p))}\n${p.words.map((w) => w.text).join(' ')}\n`)
    .join('\n');
}

/** Converte #RRGGBB / rgba() em cor ASS &HAABBGGRR (AA: 00 = opaco). */
export function assColor(css: string, opacity = 1): string {
  let r = 255,
    g = 255,
    b = 255,
    a = opacity;
  const hex = css.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const rgba = css.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (rgba) {
    const parts = rgba[1].split(',').map((x) => parseFloat(x));
    [r, g, b] = parts;
    if (parts.length > 3) a *= parts[3];
  }
  const h2 = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .toUpperCase()
      .padStart(2, '0');
  return `&H${h2(255 * (1 - a))}${h2(b)}${h2(g)}${h2(r)}`;
}

/** Cor para tags \\1c/\\3c/\\4c: &HBBGGRR (sem alfa). */
export const assBgr = (css: string) => '&H' + assColor(css).slice(4);

/** Cor principal do preenchimento (ASS não tem degradê: usa a cor do meio). */
export const mainColor = (s: TextStyle) =>
  s.fill.type === 'solid' ? s.fill.color : s.fill.colors[Math.floor(s.fill.colors.length / 2)];

const escapeAss = (t: string) => t.replace(/[{}\\]/g, '');

function wordTags(s: TextStyle, scale: number, width: number, w?: { scaleX?: number; scaleY?: number }): string {
  const px = Math.round(s.fontSize * scale * (width / 1080));
  const tags = [
    `\\fn${fontName(s.fontFamily)}`,
    `\\fs${px}`,
    `\\b${s.fontWeight >= 600 ? 1 : 0}`,
    `\\i${s.italic ? 1 : 0}`,
    `\\1c${assBgr(mainColor(s))}&`,
    `\\1a&H${Math.round(255 * (1 - s.opacity))
      .toString(16)
      .toUpperCase()
      .padStart(2, '0')}&`,
  ];
  if (s.stroke) tags.push(`\\bord${s.stroke.width}`, `\\3c${assBgr(s.stroke.color)}&`);
  else tags.push('\\bord0');
  if (s.shadow) tags.push(`\\shad${Math.max(1, Math.round(s.shadow.y / 2))}`, `\\4c${assBgr(s.shadow.color)}&`);
  else tags.push('\\shad0');
  if (s.glow) tags.push(`\\blur${Math.min(10, Math.round(s.glow.blur / 6))}`);
  // escala individual da palavra
  tags.push(`\\fscx${Math.round((w?.scaleX ?? 1) * 100)}`, `\\fscy${Math.round((w?.scaleY ?? 1) * 100)}`);
  // espaçamento entre letras (em → px)
  if (s.letterSpacing) tags.push(`\\fsp${Math.round(s.letterSpacing * px)}`);
  return `{${tags.join('')}}`;
}

export function toAss(project: Project): string {
  const { width, height } = project.video;
  const header = [
    '[Script Info]',
    '; Gerado por editor-legenda',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Inter,${Math.round(height / 20)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,0,1,5,20,20,20,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const events = project.phrases
    .filter((p) => p.words.length)
    .map((p) => {
      const preset = findPreset(p.presetId, project.customPresets);
      const lines = computeLines(p.words, preset.layout);
      const body = lines
        .map((line) =>
          line
            .map((w) => {
              const st = resolveWordStyle(preset, w.role, p.roleStyles, w.style);
              const text = st.uppercase ? w.text.toUpperCase() : w.text;
              return wordTags(st, p.scale, width, w) + escapeAss(text);
            })
            .join(' '),
        )
        .join('\\N');
      const pos = `{\\an5\\pos(${Math.round(p.x * width)},${Math.round(p.y * height)})${p.rotation ? `\\frz${-p.rotation}` : ''}\\fad(120,120)}`;
      return `Dialogue: 0,${assTime(phraseStart(p))},${assTime(phraseEnd(p))},Default,,0,0,0,,${pos}${body}`;
    });
  return [...header, ...events, ''].join('\n');
}
