import { Copy, Magnet, Minus, Plus, Scissors, Trash2, Type, ZoomIn } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { movePhraseTo, retimePhrase, setWordTime, snap, snapPoints, sortPhrases } from '../../core/edit';
import { phraseEnd, phraseStart, phraseText } from '../../core/grouping';
import { findPreset } from '../../core/presets';
import type { Phrase, Project } from '../../core/types';

export type Selection = { phraseId: string | null; wordId: string | null };

type Props = {
  project: Project;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  currentMs: number;
  playing: boolean;
  seekMs: (ms: number) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdd: () => void;
};

const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
const fmtRuler = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round((s - m * 60) * 100) / 100;
  const txt = Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, '');
  return `${m}:${r < 10 ? '0' : ''}${txt}`;
};

type Drag =
  | { kind: 'move'; id: string; x0: number; start0: number }
  | { kind: 'trimL' | 'trimR'; id: string; x0: number; start0: number; end0: number }
  | { kind: 'wordL' | 'wordR'; id: string; wordId: string; x0: number; start0: number; end0: number }
  | { kind: 'scrub' };

/** Timeline estilo NLE: régua, agulha, faixa de frases e faixa de palavras, arrastar/aparar com encaixe. */
export const Timeline: React.FC<Props> = (props) => {
  const { project, apply, currentMs, playing, seekMs, selection, onSelect } = props;
  const durationS = project.video.durationMs / 1000;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(800);
  const [pps, setPps] = useState<number | null>(null); // px por segundo; null = ajustar à largura
  const [snapOn, setSnapOn] = useState(true);
  const drag = useRef<Drag | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const fitPps = Math.max(4, (viewW - 24) / Math.max(1, durationS));
  const scale = pps ?? fitPps;
  const totalW = Math.max(viewW, durationS * scale + 24);
  const msToX = (ms: number) => (ms / 1000) * scale;
  const xToMs = (x: number) => Math.max(0, Math.min(project.video.durationMs, (x / scale) * 1000));

  const step = STEPS.find((s) => s * scale >= 70) ?? 600;
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let t = 0; t <= durationS + 1e-6; t += step) out.push(Math.round(t * 1000) / 1000);
    return out;
  }, [durationS, step]);

  // agulha sempre visível durante o play
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !playing) return;
    const x = msToX(currentMs);
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - 60);
  }, [currentMs, playing, scale]);

  const zoom = useCallback(
    (f: number) => setPps((p) => Math.min(600, Math.max(fitPps, (p ?? fitPps) * f))),
    [fitPps],
  );

  // ⌘/Ctrl + roda = zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const contentX = (clientX: number) => {
    const el = scrollRef.current!;
    return clientX - el.getBoundingClientRect().left + el.scrollLeft - 12;
  };

  const tolMs = (8 / scale) * 1000;
  const snapMs = (ms: number, exceptId?: string) =>
    snapOn ? snap(ms, [...snapPoints(project.phrases, exceptId), currentMs], tolMs) : ms;

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'scrub') return seekMs(xToMs(contentX(e.clientX)));
    const dMs = ((e.clientX - d.x0) / scale) * 1000;
    const updatePhrase = (fn: (p: Phrase) => Phrase) =>
      apply((proj) => ({ ...proj, phrases: sortPhrases(proj.phrases.map((p) => (p.id === d.id ? fn(p) : p))) }), true);
    if (d.kind === 'move') {
      updatePhrase((p) => {
        const len = phraseEnd(p) - phraseStart(p);
        let s = snapMs(d.start0 + dMs, p.id);
        const sEnd = snapMs(d.start0 + dMs + len, p.id);
        if (sEnd !== d.start0 + dMs + len && s === d.start0 + dMs) s = sEnd - len;
        return movePhraseTo(p, s);
      });
    } else if (d.kind === 'trimL') {
      updatePhrase((p) => retimePhrase(p, Math.min(snapMs(d.start0 + dMs, p.id), d.end0 - 80), d.end0));
    } else if (d.kind === 'trimR') {
      updatePhrase((p) => retimePhrase(p, d.start0, Math.max(snapMs(d.end0 + dMs, p.id), d.start0 + 80)));
    } else {
      const wd = d as Extract<Drag, { kind: 'wordL' | 'wordR' }>;
      updatePhrase((p) =>
        wd.kind === 'wordL'
          ? setWordTime(p, wd.wordId, wd.start0 + dMs, wd.end0)
          : setWordTime(p, wd.wordId, wd.start0, wd.end0 + dMs),
      );
    }
  };
  const onUp = () => {
    drag.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  const begin = (e: React.PointerEvent, d: Drag) => {
    e.stopPropagation();
    e.preventDefault();
    drag.current = d;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const selPhrase = project.phrases.find((p) => p.id === selection.phraseId) ?? null;

  return (
    <section className="timeline" aria-label="Linha do tempo">
      <div className="tl-toolbar" role="toolbar" aria-label="Ferramentas da timeline">
        <button className="icon" onClick={props.onAdd} title="Nova frase na agulha (T)" aria-label="Nova frase na agulha">
          <Type size={16} aria-hidden="true" />
        </button>
        <button className="icon" onClick={props.onSplit} disabled={!selPhrase || selPhrase.words.length < 2} title="Dividir na agulha (S)" aria-label="Dividir na agulha">
          <Scissors size={16} aria-hidden="true" />
        </button>
        <button className="icon" onClick={props.onDuplicate} disabled={!selPhrase} title="Duplicar (⌘D)" aria-label="Duplicar frase">
          <Copy size={16} aria-hidden="true" />
        </button>
        <button className="icon" onClick={props.onDelete} disabled={!selPhrase} title="Apagar (Delete)" aria-label="Apagar frase">
          <Trash2 size={16} aria-hidden="true" />
        </button>
        <span className="tl-sep" />
        <button
          className={`icon ${snapOn ? 'on' : ''}`}
          onClick={() => setSnapOn((v) => !v)}
          aria-pressed={snapOn}
          title="Encaixe (ímã)"
          aria-label="Encaixe"
        >
          <Magnet size={16} aria-hidden="true" />
        </button>
        <span className="tl-grow" />
        <button className="icon" onClick={() => zoom(1 / 1.5)} title="Afastar" aria-label="Afastar zoom">
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          type="range"
          className="tl-zoom"
          aria-label="Zoom da timeline"
          min={0}
          max={100}
          value={Math.round((Math.log(scale / fitPps) / Math.log(600 / fitPps || 2)) * 100) || 0}
          onChange={(e) => setPps(fitPps * Math.pow(600 / fitPps, Number(e.target.value) / 100))}
        />
        <button className="icon" onClick={() => zoom(1.5)} title="Aproximar (⌘ + roda)" aria-label="Aproximar zoom">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button className="icon" onClick={() => setPps(null)} title="Ajustar ao vídeo" aria-label="Ajustar zoom">
          <ZoomIn size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="tl-body">
        <div className="tl-heads" aria-hidden="true">
          <div className="tl-head ruler-h" />
          <div className="tl-head">Legendas</div>
          <div className="tl-head">Palavras</div>
          <div className="tl-head">Vídeo</div>
        </div>
        <div className="tl-scroll" ref={scrollRef}>
          <div className="tl-content" style={{ width: totalW }}>
            <div
              className="tl-ruler"
              onPointerDown={(e) => {
                seekMs(xToMs(contentX(e.clientX)));
                begin(e, { kind: 'scrub' });
              }}
            >
              {ticks.map((t) => (
                <div key={t} className="tick" style={{ left: 12 + t * scale }}>
                  <span>{fmtRuler(t)}</span>
                </div>
              ))}
            </div>

            <div
              className="tl-track"
              onPointerDown={(e) => {
                onSelect({ phraseId: null, wordId: null });
                seekMs(xToMs(contentX(e.clientX)));
              }}
            >
              {project.phrases.map((p) => {
                const s = phraseStart(p);
                const e2 = phraseEnd(p);
                const sel = p.id === selection.phraseId;
                const preset = findPreset(p.presetId, project.customPresets);
                return (
                  <div
                    key={p.id}
                    className={`clip ${sel ? 'sel' : ''} ${p.behind ? 'behind' : ''}`}
                    style={{ left: 12 + msToX(s), width: Math.max(6, msToX(e2 - s)) }}
                    title={`${preset.name}: ${phraseText(p)}`}
                    onPointerDown={(e) => {
                      onSelect({ phraseId: p.id, wordId: null });
                      begin(e, { kind: 'move', id: p.id, x0: e.clientX, start0: s });
                    }}
                    onDoubleClick={() => seekMs(s + 1)}
                  >
                    <span className="grip l" onPointerDown={(e) => { onSelect({ phraseId: p.id, wordId: null }); begin(e, { kind: 'trimL', id: p.id, x0: e.clientX, start0: s, end0: e2 }); }} />
                    <span className="clip-label">{phraseText(p)}</span>
                    <span className="grip r" onPointerDown={(e) => { onSelect({ phraseId: p.id, wordId: null }); begin(e, { kind: 'trimR', id: p.id, x0: e.clientX, start0: s, end0: e2 }); }} />
                  </div>
                );
              })}
            </div>

            <div className="tl-track words">
              {project.phrases.flatMap((p) =>
                p.words.map((w) => {
                  const sel = w.id === selection.wordId;
                  return (
                    <div
                      key={w.id}
                      className={`wclip ${sel ? 'sel' : ''} ${p.id === selection.phraseId ? 'inphrase' : ''} ${w.role}`}
                      style={{ left: 12 + msToX(w.startMs), width: Math.max(3, msToX(w.endMs - w.startMs)) }}
                      title={w.text}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onSelect({ phraseId: p.id, wordId: w.id });
                        seekMs(w.startMs + 1);
                      }}
                    >
                      <span className="grip l" onPointerDown={(e) => { onSelect({ phraseId: p.id, wordId: w.id }); begin(e, { kind: 'wordL', id: p.id, wordId: w.id, x0: e.clientX, start0: w.startMs, end0: w.endMs }); }} />
                      <span className="clip-label">{w.text}</span>
                      <span className="grip r" onPointerDown={(e) => { onSelect({ phraseId: p.id, wordId: w.id }); begin(e, { kind: 'wordR', id: p.id, wordId: w.id, x0: e.clientX, start0: w.startMs, end0: w.endMs }); }} />
                    </div>
                  );
                }),
              )}
            </div>

            <div className="tl-track video" onPointerDown={(e) => seekMs(xToMs(contentX(e.clientX)))}>
              <div className="vclip" style={{ left: 12, width: msToX(project.video.durationMs) }}>
                <span className="clip-label">{project.name}</span>
              </div>
            </div>

            <div className="playhead" style={{ left: 12 + msToX(currentMs) }} aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
};
