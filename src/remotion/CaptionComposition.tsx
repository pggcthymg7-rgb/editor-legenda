import React from 'react';
import { Video } from '@remotion/media';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { phraseStart, phraseVisibleEnd } from '../core/grouping';
import { arcPlacement, computeLines } from '../core/layout';
import { counterText, wordMotion, wordWindows } from '../core/motion';
import { findPreset, resolveAnimation, resolveWordStyle } from '../core/presets';
import type { CompositionProps, Phrase, Project, TextStyle, Word } from '../core/types';
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
  phrase: Phrase;
  project: Project;
  k: number;
  counter: boolean;
  fitWidth?: number;
  extra?: { x: number; y: number; rotate: number };
};

const WordView: React.FC<WordViewProps> = ({ word, style: rawStyle, tMs, win, phrase, project, k, counter, fitWidth, extra }) => {
  const preset = findPreset(phrase.presetId, project.customPresets);
  const anim = resolveAnimation(preset, phrase.animation);
  const m = wordMotion(tMs, win, anim);
  const isHidden = m === null;
  const st = m ?? { opacity: 0, blur: 0, translateY: 0, scale: 1 };
  let text = rawStyle.uppercase ? word.text.toUpperCase() : word.text;
  const style = fitWidth ? fitStyle(rawStyle, text, fitWidth / k) : rawStyle;
  if (counter && word.role === 'key') text = counterText(text, (tMs - win.inMs) / 900);
  const tx = (extra?.x ?? 0) + (word.dx ?? 0);
  const ty = (extra?.y ?? 0) + (word.dy ?? 0) + st.translateY;
  const rot = (extra?.rotate ?? 0) + (word.rotation ?? 0);
  return (
    <span
      style={{
        display: 'inline-block',
        // invisível ainda ocupa espaço: o bloco não "pula" quando palavras entram
        visibility: isHidden && anim.mode !== 'single' ? 'hidden' : undefined,
        opacity: st.opacity * style.opacity,
        fontFamily: fontFamilyCss(style.fontFamily),
        fontWeight: style.fontWeight,
        fontStyle: style.italic ? 'italic' : 'normal',
        fontSize: style.fontSize * k,
        letterSpacing: `${style.letterSpacing}em`,
        lineHeight: 1,
        whiteSpace: 'pre',
        padding: `${0.08 * style.fontSize * k}px ${0.06 * style.fontSize * k}px`,
        transform: `translate(${tx * k}px, ${ty * k}px) rotate(${rot}deg) scale(${st.scale})`,
        filter: filterCss(style, st.blur, k),
        WebkitTextStroke: style.stroke ? `${style.stroke.width * k}px ${style.stroke.color}` : undefined,
        ...fillCss(style),
      }}
    >
      {text}
    </span>
  );
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
  const measureLines = anim.mode === 'single' || preset.fitWidth ? [] : preset.layout === 'arc' ? [phrase.words] : computeLines(phrase.words, preset.layout);
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

  const wordEl = (w: Word, extra?: { x: number; y: number; rotate: number }) => (
    <WordView
      key={w.id}
      word={w}
      style={resolveWordStyle(preset, w.role, phrase.roleStyles, w.style)}
      tMs={tMs}
      win={winOf.get(w.id)!}
      phrase={phrase}
      project={project}
      k={k}
      counter={preset.counter}
      fitWidth={preset.fitWidth ? width * 0.92 : undefined}
      extra={extra}
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
    const lines = computeLines(phrase.words, preset.layout);
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

  return (
    <div
      data-phrase-id={phrase.id}
      style={{
        position: 'absolute',
        left: phrase.x * width,
        top: phrase.y * height,
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
};

export const CaptionLayer: React.FC<{ project: Project; tMs: number }> = ({ project, tMs }) => {
  const k = project.video.width / 1080;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {project.phrases.map((p, i) => (
        <PhraseView key={p.id} phrase={p} index={i} project={project} tMs={tMs} k={k} />
      ))}
    </AbsoluteFill>
  );
};

export const CaptionComposition: React.FC<CompositionProps> = ({ project, background }) => {
  useFontsReady(project);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tMs = (frame / fps) * 1000;
  return (
    <AbsoluteFill style={{ backgroundColor: background === 'green' ? '#00FF00' : 'transparent' }}>
      {background === 'video' && project.video.src ? // @remotion/media: funciona no render do servidor e no render dentro do navegador (iPhone)
        <Video src={project.video.src} /> : null}
      <CaptionLayer project={project} tMs={tMs} />
    </AbsoluteFill>
  );
};
