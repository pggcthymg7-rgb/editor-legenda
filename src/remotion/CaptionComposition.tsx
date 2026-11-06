import React from 'react';
import { Video } from '@remotion/media';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useRef, useState } from 'react';
import { grayToAlpha, maskIndexAt } from '../core/mask';
import { anchorHomography, homographyCss } from '../tracking3d/model';
import { phraseStart, phraseVisibleEnd } from '../core/grouping';
import { arcPlacement, computeLines } from '../core/layout';
import { counterText, highlightPop, wordMotion, wordWindows } from '../core/motion';
import { findPreset, resolveAnimation, resolveWordStyle } from '../core/presets';
import type { Animation, CompositionProps, Phrase, Project, TextStyle, Word } from '../core/types';
import { fitStyle, fontFamilyCss, measureText, useFontsReady } from './fonts';

export const fillCss = (s: TextStyle): React.CSSProperties => {
  if (s.fill.type === 'solid') return { color: s.fill.color };
  return {
    backgroundImage: `linear-gradient(${s.fill.angle}deg, ${s.fill.colors.join(', ')})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  };
};

/** Sombra/brilho via drop-shadow (funciona com degradê, text-shadow não). */
export const filterCss = (s: TextStyle, blur: number, k: number): string => {
  const f: string[] = [];
  if (blur > 0.1) f.push(`blur(${blur * k}px)`);
  if (s.glow) f.push(`drop-shadow(0 0 ${s.glow.blur * k}px ${s.glow.color})`, `drop-shadow(0 0 ${s.glow.blur * 0.4 * k}px ${s.glow.color})`);
  if (s.shadow) f.push(`drop-shadow(${s.shadow.x * k}px ${s.shadow.y * k}px ${s.shadow.blur * k}px ${s.shadow.color})`);
  return f.join(' ') || 'none';
};

type WordViewProps = {
  word: Word;
  style: TextStyle;
  tMs: number;
  win: { inMs: number; outMs: number };
  /** animação já resolvida pela frase (uma vez por quadro, não por palavra) */
  anim: Animation;
  k: number;
  counter: boolean;
  fitWidth?: number;
  extra?: { x: number; y: number; rotate: number };
  /** karaokê 2.0: escala extra da palavra falada (1 = nenhuma) */
  pop?: number;
};

const WordView: React.FC<WordViewProps> = ({ word, style: rawStyle, tMs, win, anim, k, counter, fitWidth, extra, pop = 1 }) => {
  const m = wordMotion(tMs, win, anim);
  const isHidden = m === null;
  const st = m ?? { opacity: 0, blur: 0, translateY: 0, scale: 1 };
  let text = rawStyle.uppercase ? word.text.toUpperCase() : word.text;
  const style = fitWidth ? fitStyle(rawStyle, text, fitWidth / k) : rawStyle;
  if (counter && word.role === 'key') text = counterText(text, (tMs - win.inMs) / 900);
  const tx = (extra?.x ?? 0) + (word.dx ?? 0);
  const ty = (extra?.y ?? 0) + (word.dy ?? 0) + st.translateY;
  const rot = (extra?.rotate ?? 0) + (word.rotation ?? 0);
  const sx = st.scale * (word.scaleX ?? 1) * pop;
  const sy = st.scale * (word.scaleY ?? 1) * pop;
  const fs = style.fontSize * k;
  const box = style.box;
  return (
    <span
      data-word-id={word.id}
      style={{
        display: 'inline-block',
        // invisível ainda ocupa espaço: o bloco não "pula" quando palavras entram
        visibility: isHidden && anim.mode !== 'single' ? 'hidden' : undefined,
        opacity: st.opacity * style.opacity,
        transform: `translate(${tx * k}px, ${ty * k}px) rotate(${rot}deg) scale(${sx}, ${sy})`,
        filter: filterCss(style, st.blur, k),
        lineHeight: 1,
        ...(box
          ? {
              backgroundColor: hexA(box.color, box.opacity),
              padding: `${box.padY * fs}px ${box.padX * fs}px`,
              borderRadius: box.radius * fs,
            }
          : null),
      }}
    >
      <span
        style={{
          display: 'inline-block',
          fontFamily: fontFamilyCss(style.fontFamily),
          fontWeight: style.fontWeight,
          fontStyle: style.italic ? 'italic' : 'normal',
          fontSize: fs,
          letterSpacing: `${style.letterSpacing}em`,
          lineHeight: 1,
          whiteSpace: 'pre',
          padding: `${0.08 * fs}px ${0.06 * fs}px`,
          WebkitTextStroke: style.stroke ? `${style.stroke.width * k}px ${style.stroke.color}` : undefined,
          paintOrder: 'stroke fill',
          ...fillCss(style),
        }}
      >
        {text}
      </span>
    </span>
  );
};

/** #rrggbb + opacidade → rgba(); outras cores passam direto. */
export const hexA = (c: string, a: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
};

export const PhraseView: React.FC<{ phrase: Phrase; index: number; project: Project; tMs: number; k: number }> = ({
  phrase,
  index,
  project,
  tMs,
  k,
}) => {
  const preset = findPreset(phrase.presetId, project.customPresets);
  const anim = resolveAnimation(preset, phrase.animation);
  const visEnd = phraseVisibleEnd(project.phrases, index, anim.holdMs);
  if (!phrase.words.length || tMs < phraseStart(phrase) || tMs >= visEnd) return null;
  const wins = wordWindows(phrase, anim, visEnd);
  const winOf = new Map(phrase.words.map((w, i) => [w.id, wins[i]]));
  const align = phrase.align ?? preset.align;
  const { width, height } = project.video;

  // encolhe o bloco se a linha mais larga passar de 90% da tela
  // linhas calculadas uma vez: servem para medir e para montar o bloco
  const lines = preset.layout === 'arc' ? [phrase.words] : computeLines(phrase.words, preset.layout);
  const measureLines = anim.mode === 'single' || preset.fitWidth ? [] : lines;
  const widest = Math.max(
    0,
    ...measureLines.map((line) =>
      line.reduce((sum, w) => {
        const st = resolveWordStyle(preset, w.role, phrase.roleStyles, w.style);
        return sum + measureText(st.uppercase ? w.text.toUpperCase() : w.text, st, st.fontSize) + 0.3 * st.fontSize;
      }, 0),
    ),
  );
  const fit = preset.layout !== 'inline' && widest * k * phrase.scale > width * 0.9 ? (width * 0.9) / (widest * k * phrase.scale) : 1;

  const styleOf = (w: Word) => {
    const base = resolveWordStyle(preset, w.role, phrase.roleStyles, w.style);
    // destaque (karaoke): palavra sendo falada agora ganha o estilo de destaque
    const hl = phrase.highlight;
    return hl && tMs >= w.startMs && tMs < w.endMs ? { ...base, ...hl } : base;
  };
  const wordEl = (w: Word, extra?: { x: number; y: number; rotate: number }) => (
    <WordView
      key={w.id}
      word={w}
      style={styleOf(w)}
      tMs={tMs}
      win={winOf.get(w.id)!}
      anim={anim}
      k={k}
      counter={preset.counter}
      fitWidth={preset.fitWidth ? width * 0.92 : undefined}
      extra={extra}
      pop={phrase.highlight ? highlightPop(tMs, w, phrase.highlightScale ?? 1) : 1}
    />
  );

  let content: React.ReactNode;
  if (anim.mode === 'single') {
    // só a palavra ativa, centralizada
    const active = phrase.words.find((w) => {
      const win = winOf.get(w.id)!;
      return tMs >= win.inMs && tMs < win.outMs;
    });
    content = active ? wordEl(active) : null;
  } else if (preset.layout === 'arc') {
    content = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 * k }}>
        {phrase.words.map((w, i) => wordEl(w, arcPlacement(i, phrase.words.length)))}
      </div>
    );
  } else {
    content = lines.map((line, li) => (
      <div
        key={li}
        style={{
          display: 'flex',
          flexWrap: preset.layout === 'inline' ? 'wrap' : 'nowrap',
          justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          alignItems: 'baseline',
          columnGap: 0.18 * resolveWordStyle(preset, line[0].role, phrase.roleStyles).fontSize * k,
          marginTop: li ? preset.lineGap * resolveWordStyle(preset, line[0].role, phrase.roleStyles).fontSize * k : 0,
        }}
      >
        {line.map((w) => wordEl(w))}
      </div>
    ));
  }

  // grudada na cena 3D: a câmera rastreada vira uma homografia (perspectiva + parallax reais) por quadro
  const tr = project.video.track3d;
  const H = phrase.anchor3d && tr ? anchorHomography(tr, phrase.anchor3d, tMs, width, height) : null;
  if (phrase.anchor3d && tr && !H) return null; // âncora atrás da câmera
  const body = (
    <div
      data-phrase-id={phrase.id}
      style={{
        position: 'absolute',
        left: H ? 0 : phrase.x * width,
        top: H ? 0 : phrase.y * height,
        transform: `translate(-50%, -50%) perspective(${1400 * k}px) rotateX(${phrase.rotateX}deg) rotateY(${phrase.rotateY}deg) rotate(${phrase.rotation}deg) scale(${phrase.scale * fit})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        // sem isso o bloco fica preso à metade da tela (left = centro) e espreme o texto
        width: 'max-content',
        maxWidth: preset.layout === 'inline' ? width * 0.86 : undefined,
        textAlign: align,
      }}
    >
      {content}
    </div>
  );
  if (!H) return body;
  return (
    <div data-anchor3d="" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: homographyCss(H) }}>
      {body}
    </div>
  );
};

// ---------- Legenda atrás da pessoa ----------

const maskCache = new Map<string, string>();

/**
 * Limpa máscaras já convertidas (ex.: análise de pessoa refeita).
 * `prefix` filtra pela URL da máscara (ex.: "/media/masks/m_abc/"); sem ele, limpa tudo.
 */
export function clearMaskCache(prefix?: string): void {
  if (!prefix) return maskCache.clear();
  for (const key of [...maskCache.keys()]) {
    const url = key.slice(key.indexOf('|') + 1);
    if (url.startsWith(prefix) || key.startsWith(prefix)) maskCache.delete(key);
  }
}
const remember = (key: string, v: string) => {
  maskCache.set(key, v);
  if (maskCache.size > 150) maskCache.delete(maskCache.keys().next().value!);
};

function loadMask(url: string, mode: 'hole' | 'person'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(url)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      grayToAlpha(data.data, mode);
      ctx.putImageData(data, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('máscara não carregou'));
    img.src = url;
  });
}

/**
 * Máscara CSS (data URL com alfa) do tempo atual; segura o render até ela estar no DOM.
 * - índice por tempo (`maskIndexAt`), independente do fps da composição;
 * - `continueRender` uma única vez: depois do commit da máscara certa, no erro ou ao desmontar;
 * - no preview, enquanto carrega, mostra a última máscara (não pisca); se falhar, nenhuma.
 */
export function useMask(urls: string[] | undefined, tMs: number, mode: 'hole' | 'person', enabled: boolean): string | null {
  const url = enabled && urls?.length ? urls[maskIndexAt(tMs, urls.length)] : null;
  const key = url ? `${mode}|${url}` : '';
  const [state, setState] = useState<{ key: string; css: string | null } | null>(null);
  const pending = useRef<{ key: string; handle: number } | null>(null);
  const cached = key ? maskCache.get(key) : undefined;

  const release = (k?: string) => {
    const p = pending.current;
    if (!p || (k !== undefined && p.key !== k)) return;
    pending.current = null;
    continueRender(p.handle);
  };

  useEffect(() => {
    if (!url || cached) return;
    let alive = true;
    pending.current = { key, handle: delayRender('Máscara da pessoa', { timeoutInMilliseconds: 30000 }) };
    loadMask(url, mode)
      .then((css) => {
        remember(key, css);
        if (alive) setState({ key, css });
        else release(key);
      })
      .catch(() => {
        if (alive) setState({ key, css: null });
        release(key);
      });
    return () => {
      alive = false;
      release(key);
    };
  }, [key, url, cached, mode]);

  // libera só depois que o quadro com a máscara desta chave foi commitado
  useEffect(() => {
    if (state?.key) release(state.key);
  }, [state]);

  if (!url) return null;
  if (cached) return cached;
  if (state?.key === key) return state.css;
  return state?.css ?? null;
}

const maskStyle = (css: string): React.CSSProperties => ({
  maskImage: `url("${css}")`,
  WebkitMaskImage: `url("${css}")`,
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
});

export const CaptionLayer: React.FC<{ project: Project; tMs: number; holeMask?: string | null }> = ({ project, tMs, holeMask }) => {
  const k = project.video.width / 1080;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {project.phrases.map((p, i) =>
        p.behind && holeMask ? (
          <AbsoluteFill key={p.id} style={maskStyle(holeMask)}>
            <PhraseView phrase={p} index={i} project={project} tMs={tMs} k={k} />
          </AbsoluteFill>
        ) : (
          <PhraseView key={p.id} phrase={p} index={i} project={project} tMs={tMs} k={k} />
        ),
      )}
    </AbsoluteFill>
  );
};

export const CaptionComposition: React.FC<CompositionProps> = ({ project, background, maskUrls, layer = 'captions' }) => {
  useFontsReady(project);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tMs = (frame / fps) * 1000;
  const anyBehind = project.occlusion !== false && project.phrases.some((p) => p.behind);
  const holeMask = useMask(maskUrls, tMs, 'hole', layer === 'captions' && anyBehind);
  const personMask = useMask(maskUrls, tMs, 'person', layer === 'person');
  const bg = background === 'green' ? '#00FF00' : 'transparent';

  if (layer === 'person') {
    // camada da frente: só a pessoa recortada (para empilhar no Premiere/CapCut)
    return (
      <AbsoluteFill style={{ backgroundColor: bg }}>
        {project.video.src && personMask ? (
          <AbsoluteFill style={maskStyle(personMask)}>
            <Video src={project.video.src} muted />
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {background === 'video' && project.video.src ? <Video src={project.video.src} /> : null}
      <CaptionLayer project={project} tMs={tMs} holeMask={holeMask} />
    </AbsoluteFill>
  );
};
