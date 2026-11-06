import { Player, type PlayerRef } from '@remotion/player';
import { ChevronFirst, ChevronLast, Grid3x3, Pause, Play, ScanLine, StepBack, StepForward, Volume2, VolumeX } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CompositionProps, Project, Word } from '../../core/types';
import { CaptionComposition } from '../../remotion/CaptionComposition';
import { FPS } from '../../remotion/Root';
import type { Selection } from './Timeline';

type Props = {
  project: Project;
  playerRef: React.RefObject<PlayerRef | null>;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onMovePhrase: (id: string, x: number, y: number) => void;
  onMoveWord: (phraseId: string, wordId: string, patch: Partial<Word>) => void;
  /** alças do monitor: escala e rotação da frase */
  onTransformPhrase?: (id: string, patch: { scale?: number; rotation?: number }) => void;
  onTime: (ms: number) => void;
  onPlaying: (p: boolean) => void;
  currentMs: number;
  playing: boolean;
  maskUrls?: string[];
};

export const timecode = (ms: number) => {
  const t = Math.max(0, ms) / 1000;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t * FPS) % FPS);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
};

type Box = { left: number; top: number; width: number; height: number } | null;

/** Monitor: player + seleção clicando no texto + arrastar frase/palavra + guias de área segura. */
export const Preview: React.FC<Props> = ({
  project,
  playerRef,
  selection,
  onSelect,
  onMovePhrase,
  onMoveWord,
  onTransformPhrase,
  onTime,
  onPlaying,
  currentMs,
  playing,
  maskUrls,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const { width, height, durationMs } = project.video;
  const [safe, setSafe] = useState(false);
  const [grid, setGrid] = useState(false);
  const [muted, setMuted] = useState(false);
  const [box, setBox] = useState<Box>(null);
  const [snapGuide, setSnapGuide] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const durationInFrames = Math.max(1, Math.ceil((durationMs / 1000) * FPS));

  // encaixa o palco (proporção do vídeo) no espaço disponível
  useLayoutEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const ar = width / height;
      let w = r.width;
      let h = w / ar;
      if (h > r.height) {
        h = r.height;
        w = h * ar;
      }
      setStageSize({ w: Math.floor(w), h: Math.floor(h) });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const h = (e: { detail: { frame: number } }) => onTime((e.detail.frame / FPS) * 1000);
    const onPlay = () => onPlaying(true);
    const onPause = () => onPlaying(false);
    p.addEventListener('frameupdate', h);
    p.addEventListener('seeked', h);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('ended', onPause);
    return () => {
      p.removeEventListener('frameupdate', h);
      p.removeEventListener('seeked', h);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('ended', onPause);
    };
  }, [playerRef, onTime, onPlaying]);

  // contorno da seleção (mede o elemento real renderizado)
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return setBox(null);
    const sel = selection.wordId
      ? stage.querySelector(`[data-word-id="${CSS.escape(selection.wordId)}"]`)
      : selection.phraseId
        ? stage.querySelector(`[data-phrase-id="${CSS.escape(selection.phraseId)}"]`)
        : null;
    if (!sel) return setBox(null);
    const r = sel.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    setBox({ left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height });
  }, [selection]);
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure, currentMs, project, stageSize]);

  const onPointerDown = (e: React.PointerEvent) => {
    const stage = stageRef.current;
    if (!stage || (e.target as HTMLElement).closest('.transport')) return;
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-handle]');
    if (handle && box && selection.phraseId && onTransformPhrase) {
      const phrase = project.phrases.find((p) => p.id === selection.phraseId);
      if (!phrase) return;
      e.preventDefault();
      e.stopPropagation();
      const s = stage.getBoundingClientRect();
      const cx = s.left + box.left + box.width / 2;
      const cy = s.top + box.top + box.height / 2;
      const kind = handle.dataset.handle as 'scale' | 'rotate';
      const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy));
      const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
      const scale0 = phrase.scale || 1;
      const rot0 = phrase.rotation || 0;
      const id = phrase.id;
      const move = (ev: PointerEvent) => {
        if (kind === 'scale') {
          const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
          onTransformPhrase(id, { scale: Math.round(Math.min(5, Math.max(0.2, (scale0 * d) / d0)) * 100) / 100 });
        } else {
          let r = rot0 + ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
          r = ((((r + 180) % 360) + 360) % 360) - 180;
          // ímã a cada 15° (ou livre com Alt)
          const near = Math.round(r / 15) * 15;
          if (!ev.altKey && Math.abs(r - near) < 3) r = near;
          onTransformPhrase(id, { rotation: Math.round(r) });
        }
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return;
    }
    const hits = document.elementsFromPoint(e.clientX, e.clientY);
    const phraseEl = hits.find((h) => h instanceof HTMLElement && h.dataset.phraseId) as HTMLElement | undefined;
    // palavra ainda invisível (revelação palavra a palavra) não recebe clique: acha pela caixa
    const wordEl =
      (hits.find((h) => h instanceof HTMLElement && h.dataset.wordId) as HTMLElement | undefined) ??
      ([...(phraseEl?.querySelectorAll<HTMLElement>('[data-word-id]') ?? [])].find((w) => {
        const r = w.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      }) as HTMLElement | undefined);
    if (!phraseEl) {
      onSelect({ phraseId: null, wordId: null });
      return;
    }
    const phraseId = phraseEl.dataset.phraseId!;
    const phrase = project.phrases.find((p) => p.id === phraseId);
    if (!phrase) return;
    const hitWordId = wordEl?.dataset.wordId ?? null;
    const wasPhraseSelected = selection.phraseId === phraseId;
    // Alt+clique ou palavra já selecionada arrasta a palavra; senão arrasta a frase inteira
    // e clique simples (sem arrastar) numa frase já selecionada passa a selecionar a palavra.
    const initialWordId = hitWordId && (e.altKey || selection.wordId === hitWordId) ? hitWordId : null;
    onSelect({ phraseId, wordId: initialWordId });
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const word = initialWordId ? phrase.words.find((w) => w.id === initialWordId) : null;
    const start = { x: phrase.x, y: phrase.y, dx: word?.dx ?? 0, dy: word?.dy ?? 0 };
    // px de tela → unidades da composição (base 1080)
    const unit = 1080 / rect.width / (phrase.scale || 1);
    const rad = -((phrase.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let dragged = false;
    const move = (ev: PointerEvent) => {
      const ddx = ev.clientX - x0;
      const ddy = ev.clientY - y0;
      if (!dragged && Math.hypot(ddx, ddy) < 4) return;
      dragged = true;
      if (word) {
        const rdx = ddx * cos - ddy * sin;
        const rdy = ddx * sin + ddy * cos;
        onMoveWord(phraseId, word.id, { dx: Math.round(start.dx + rdx * unit), dy: Math.round(start.dy + rdy * unit) });
      } else {
        let nx = Math.min(1, Math.max(0, start.x + ddx / rect.width));
        let ny = Math.min(1, Math.max(0, start.y + ddy / rect.height));
        const sx = Math.abs(nx - 0.5) < 0.015;
        const sy = Math.abs(ny - 0.5) < 0.015;
        if (sx) nx = 0.5;
        if (sy) ny = 0.5;
        setSnapGuide({ x: sx, y: sy });
        onMovePhrase(phraseId, nx, ny);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setSnapGuide({ x: false, y: false });
      if (!dragged && wasPhraseSelected && hitWordId && !initialWordId) {
        onSelect({ phraseId, wordId: hitWordId });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const p = playerRef.current;
  const frame = Math.round((currentMs / 1000) * FPS);
  const inputProps: CompositionProps = { project, background: 'video', maskUrls };

  return (
    <div className="monitor">
      <div className="stage-holder" ref={holderRef}>
        <div
          className="stage"
          ref={stageRef}
          style={{ width: stageSize.w, height: stageSize.h }}
          onPointerDownCapture={onPointerDown}
          aria-label="Monitor do vídeo. Clique numa legenda para selecionar e arraste para mover."
        >
          <Player
            ref={playerRef}
            component={CaptionComposition}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={FPS}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: '100%', height: '100%' }}
            controls={false}
            clickToPlay={false}
            spaceKeyToPlayOrPause={false}
            initiallyMuted={muted}
            acknowledgeRemotionLicense
          />
          {safe && (
            <div className="safe" aria-hidden="true">
              <div className="safe-top" />
              <div className="safe-bottom" />
              <div className="safe-right" />
              <span className="safe-label">Área segura Reels/TikTok</span>
            </div>
          )}
          {grid && <div className="thirds" aria-hidden="true" />}
          {snapGuide.x && <div className="snap-line x" aria-hidden="true" />}
          {snapGuide.y && <div className="snap-line y" aria-hidden="true" />}
          {box && <div className={`selbox ${selection.wordId ? 'word' : ''}`} style={box} aria-hidden="true" />}
          {box && !selection.wordId && onTransformPhrase && !playing && (
            <>
              <div
                className="handle scale"
                data-handle="scale"
                style={{ left: box.left + box.width, top: box.top + box.height }}
                title="Arraste para mudar o tamanho"
                aria-hidden="true"
              />
              <div
                className="handle rotate"
                data-handle="rotate"
                style={{ left: box.left + box.width / 2, top: box.top - 22 }}
                title="Arraste para girar (ímã a cada 15°, Alt = livre)"
                aria-hidden="true"
              />
            </>
          )}
        </div>
      </div>
      <div className="transport" role="toolbar" aria-label="Controles de reprodução">
        <button className="icon" onClick={() => p?.seekTo(0)} aria-label="Início" title="Início (Home)">
          <ChevronFirst size={18} aria-hidden="true" />
        </button>
        <button className="icon" onClick={() => p?.seekTo(Math.max(0, frame - 1))} aria-label="Quadro anterior" title="Quadro anterior (←)">
          <StepBack size={18} aria-hidden="true" />
        </button>
        <button className="icon play" onClick={() => p?.toggle()} aria-label={playing ? 'Pausar' : 'Reproduzir'} title="Play/Pause (Espaço)">
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button className="icon" onClick={() => p?.seekTo(Math.min(durationInFrames - 1, frame + 1))} aria-label="Próximo quadro" title="Próximo quadro (→)">
          <StepForward size={18} aria-hidden="true" />
        </button>
        <button className="icon" onClick={() => p?.seekTo(durationInFrames - 1)} aria-label="Fim" title="Fim (End)">
          <ChevronLast size={18} aria-hidden="true" />
        </button>
        <span className="tc" aria-live="off">
          {timecode(currentMs)} <span className="muted">/ {timecode(durationMs)}</span>
        </span>
        <span className="tl-grow" />
        <button
          className={`icon ${muted ? 'on' : ''}`}
          onClick={() => {
            setMuted((m) => {
              if (m) p?.unmute();
              else p?.mute();
              return !m;
            });
          }}
          aria-pressed={muted}
          aria-label={muted ? 'Ativar som' : 'Silenciar'}
          title="Som"
        >
          {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
        <button className={`icon ${safe ? 'on' : ''}`} onClick={() => setSafe((v) => !v)} aria-pressed={safe} aria-label="Área segura" title="Guias de área segura (Reels/TikTok)">
          <ScanLine size={18} aria-hidden="true" />
        </button>
        <button className={`icon ${grid ? 'on' : ''}`} onClick={() => setGrid((v) => !v)} aria-pressed={grid} aria-label="Grade de terços" title="Grade de terços">
          <Grid3x3 size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
