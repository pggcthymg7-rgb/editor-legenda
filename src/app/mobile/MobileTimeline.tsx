import { usePinch } from '@use-gesture/react';
import { Plus, Volume2, VolumeX, X } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { movePhraseTo, retimePhrase, setWordTime, snap, snapPoints, sortPhrases } from '../../core/edit';
import { phraseEnd, phraseStart, phraseText } from '../../core/grouping';
import type { Phrase, Project } from '../../core/types';
import type { Selection } from '../components/Timeline';
import { loadPeaks } from '../waveform';

export type MobileTimelineProps = {
  project: Project;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  currentMs: number;
  playing: boolean;
  seekMs: (ms: number) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAddAtPlayhead?: () => void;
  mediaUrl?: string | null;
};

const STEPS = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];

export function msToTimelineX(ms: number, scale: number): number {
  return Math.max(0, (ms / 1000) * scale);
}

export function timelineXToMs(x: number, scale: number, durationMs: number): number {
  if (scale <= 0) return 0;
  return Math.max(0, Math.min(durationMs, (x / scale) * 1000));
}

const fmtCapcutRuler = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// Cache em memória de tiras de miniaturas por URL de vídeo
const stripCache = new Map<string, Promise<string[]>>();

function extractVideoStrip(url: string, durationMs: number, count = 8): Promise<string[]> {
  const hit = stripCache.get(url);
  if (hit) return hit;
  const p = new Promise<string[]>((resolve) => {
    if (typeof document === 'undefined') return resolve([]);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    const frames: string[] = [];
    const durS = Math.max(0.5, durationMs / 1000);
    let idx = 0;

    const cleanup = () => {
      v.removeAttribute('src');
      v.load();
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(frames);
    }, 6000);

    const captureNext = () => {
      if (idx >= count) {
        clearTimeout(timer);
        cleanup();
        resolve(frames);
        return;
      }
      const targetS = Math.min(durS - 0.05, ((idx + 0.5) / count) * durS);
      v.currentTime = Math.max(0, targetS);
    };

    v.onloadeddata = () => captureNext();
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas');
        const vw = v.videoWidth || 160;
        const vh = v.videoHeight || 90;
        const h = 44;
        const w = Math.max(28, Math.round((vw / vh) * h));
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          frames.push(c.toDataURL('image/jpeg', 0.55));
        }
      } catch {
        // ignora falha de canvas
      }
      idx++;
      captureNext();
    };
    v.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(frames);
    };
  });
  stripCache.set(url, p);
  while (stripCache.size > 6) stripCache.delete(stripCache.keys().next().value!);
  return p;
}

type ClipDrag =
  | { kind: 'move'; id: string; x0: number; start0: number }
  | { kind: 'trimL' | 'trimR'; id: string; x0: number; start0: number; end0: number }
  | { kind: 'wordL' | 'wordR'; id: string; wordId: string; x0: number; start0: number; end0: number };

export const MobileTimeline: React.FC<MobileTimelineProps> = ({
  project,
  apply,
  currentMs,
  playing,
  seekMs,
  selection,
  onSelect,
  onAddAtPlayhead,
  mediaUrl,
}) => {
  const durationMs = Math.max(100, project.video.durationMs);
  const durationS = durationMs / 1000;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(360);
  const [scale, setScale] = useState(88); // px por segundo padrão CapCut
  const [wordsTrackDismissedFor, setWordsTrackDismissedFor] = useState<string | null>(null);
  const [clipAudioVisual, setClipAudioVisual] = useState(true);

  const programmaticScrollRef = useRef(false);
  const userTouchingScrollRef = useRef(false);
  const clipDragRef = useRef<ClipDrag | null>(null);
  const clipDragMovedRef = useRef(false);

  const halfW = Math.floor(viewW / 2);
  const trackW = Math.max(40, Math.ceil(durationS * scale));

  // Mede largura da viewport da timeline
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth || 360));
    ro.observe(el);
    setViewW(el.clientWidth || 360);
    return () => ro.disconnect();
  }, []);

  // Sincroniza scrollLeft quando currentMs muda por reprodução ou busca externa
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || userTouchingScrollRef.current || clipDragRef.current) return;
    const targetScroll = msToTimelineX(currentMs, scale);
    if (Math.abs(el.scrollLeft - targetScroll) > 1.5) {
      programmaticScrollRef.current = true;
      el.scrollLeft = targetScroll;
    }
  }, [currentMs, scale]);

  // Quando o usuário rola a trilha com 1 dedo, a agulha central fixa lê o tempo sob o centro
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false;
      return;
    }
    if (playing && !userTouchingScrollRef.current) return;
    const nextMs = timelineXToMs(el.scrollLeft, scale, durationMs);
    seekMs(nextMs);
  }, [scale, durationMs, playing, seekMs]);

  // Pinça de 2 dedos para zoom horizontal mantendo o tempo na agulha central
  usePinch(
    ({ offset: [s], event }) => {
      event?.preventDefault();
      const nextScale = Math.round(Math.min(360, Math.max(24, s)));
      setScale(nextScale);
    },
    {
      target: scrollRef,
      scaleBounds: { min: 24, max: 360 },
      from: () => [scale, 0],
      eventOptions: { passive: false },
    },
  );

  // Ticks da régua
  const step = STEPS.find((s) => s * scale >= 68) ?? 60;
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let t = 0; t <= durationS + 1e-6; t += step) {
      out.push(Math.round(t * 100) / 100);
    }
    return out;
  }, [durationS, step]);

  // Janela visível para virtualização de blocos de legenda
  const visibleStartMs = Math.max(0, currentMs - ((halfW + 240) / scale) * 1000);
  const visibleEndMs = Math.min(durationMs, currentMs + ((halfW + 240) / scale) * 1000);

  const visiblePhrases = useMemo(
    () =>
      project.phrases.filter((p) => {
        if (p.id === selection.phraseId) return true;
        const s = phraseStart(p);
        const e = phraseEnd(p);
        return e >= visibleStartMs && s <= visibleEndMs;
      }),
    [project.phrases, selection.phraseId, visibleStartMs, visibleEndMs],
  );

  const selPhrase = useMemo(
    () => project.phrases.find((p) => p.id === selection.phraseId) ?? null,
    [project.phrases, selection.phraseId],
  );

  const showWordsTrack = !!selPhrase && wordsTrackDismissedFor !== selPhrase.id;

  // Forma de onda e miniaturas da trilha de vídeo
  const waveRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    if (mediaUrl) {
      loadPeaks(mediaUrl, 1200).then((p) => alive && setPeaks(p));
      extractVideoStrip(mediaUrl, durationMs, 8).then((t) => alive && setThumbs(t));
    } else {
      setPeaks(null);
      setThumbs([]);
    }
    return () => {
      alive = false;
    };
  }, [mediaUrl, durationMs]);

  useEffect(() => {
    const c = waveRef.current;
    if (!c || !peaks) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = peaks.length;
    c.height = 24;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(0, 212, 235, 0.72)';
    for (let i = 0; i < peaks.length; i++) {
      const h = Math.max(1, peaks[i] * 20);
      ctx.fillRect(i, 12 - h / 2, 1, h);
    }
  }, [peaks]);

  // Arraste de bloco/alças de legenda ou palavra
  const tolMs = (8 / scale) * 1000;
  const snapMs = (ms: number, exceptId?: string) =>
    snap(ms, [...snapPoints(project.phrases, exceptId), currentMs], tolMs);

  const onClipPointerMove = (e: PointerEvent) => {
    const d = clipDragRef.current;
    if (!d) return;
    if (!clipDragMovedRef.current && Math.abs(e.clientX - d.x0) < 4) return;
    clipDragMovedRef.current = true;
    const dMs = ((e.clientX - d.x0) / scale) * 1000;
    const updatePhrase = (fn: (p: Phrase) => Phrase) =>
      apply(
        (proj) => ({
          ...proj,
          phrases: sortPhrases(proj.phrases.map((p) => (p.id === d.id ? fn(p) : p))),
        }),
        true,
      );

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
      const wd = d as Extract<ClipDrag, { kind: 'wordL' | 'wordR' }>;
      updatePhrase((p) =>
        wd.kind === 'wordL'
          ? setWordTime(p, wd.wordId, wd.start0 + dMs, wd.end0)
          : setWordTime(p, wd.wordId, wd.start0, wd.end0 + dMs),
      );
    }
  };

  const onClipPointerUp = () => {
    clipDragRef.current = null;
    clipDragMovedRef.current = false;
    window.removeEventListener('pointermove', onClipPointerMove);
    window.removeEventListener('pointerup', onClipPointerUp);
    window.removeEventListener('pointercancel', onClipPointerUp);
  };

  const beginClipDrag = (e: React.PointerEvent, d: ClipDrag) => {
    e.stopPropagation();
    e.preventDefault();
    clipDragRef.current = d;
    clipDragMovedRef.current = false;
    window.addEventListener('pointermove', onClipPointerMove);
    window.addEventListener('pointerup', onClipPointerUp);
    window.addEventListener('pointercancel', onClipPointerUp);
  };

  return (
    <section
      className="relative flex flex-col select-none bg-[#0B0C10] border-t border-white/[0.07] overflow-hidden"
      aria-label="Linha do tempo"
    >
      {/* Área scrollável com padding 50% para que qualquer tempo pare sob a agulha central */}
      <div
        ref={scrollRef}
        className="mob-tl-scroll relative overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={handleScroll}
        onTouchStart={() => {
          userTouchingScrollRef.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            userTouchingScrollRef.current = false;
          }, 120);
        }}
        onPointerDown={() => {
          userTouchingScrollRef.current = true;
        }}
        onPointerUp={() => {
          userTouchingScrollRef.current = false;
        }}
      >
        <div
          className="relative"
          style={{
            width: trackW + halfW * 2,
            paddingLeft: halfW,
            paddingRight: halfW,
          }}
        >
          {/* 1. Régua de Tempo */}
          <div
            className="relative h-6 border-b border-white/[0.05] text-[10px] text-[#9CA3AF] font-mono"
            style={{ width: trackW }}
          >
            {ticks.map((t) => {
              const isMajor = Number.isInteger(t);
              return (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: t * scale }}
                >
                  {isMajor ? (
                    <span className="-translate-x-1/2 text-[10px] text-[#9CA3AF]/90">
                      {fmtCapcutRuler(t)}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-white/25 -translate-x-1/2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 2. Trilha do Vídeo (Miniaturas + Forma de Onda) */}
          <div className="relative h-12 my-1.5" style={{ width: trackW }}>
            <div
              className="relative w-full h-full rounded-lg overflow-hidden bg-[#15171E] border border-white/10 flex"
              onClick={() => onSelect({ phraseId: null, wordId: null })}
            >
              {thumbs.length > 0 ? (
                <div className="absolute inset-0 flex w-full h-full">
                  {thumbs.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="flex-1 h-full object-cover opacity-75 pointer-events-none"
                      draggable={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center px-3 text-[11px] text-[#9CA3AF] truncate">
                  {project.name}
                </div>
              )}
              {peaks && (
                <canvas
                  ref={waveRef}
                  className="absolute inset-x-0 bottom-0 w-full h-6 pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* 3. Trilha de Legendas (Blocos Laranja CapCut) */}
          <div
            className="relative h-10 my-1"
            style={{ width: trackW }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onSelect({ phraseId: null, wordId: null });
              }
            }}
          >
            {project.phrases.length === 0 && onAddAtPlayhead && (
              <button
                type="button"
                onClick={onAddAtPlayhead}
                className="absolute top-0.5 bottom-0.5 left-0 flex items-center gap-1.5 px-3 rounded-md bg-white/[0.06] border border-dashed border-white/20 text-[11px] text-[#9CA3AF] hover:text-white"
              >
                <Plus size={13} aria-hidden="true" />
                <span>+ Adicionar legenda</span>
              </button>
            )}

            {visiblePhrases.map((p) => {
              const s = phraseStart(p);
              const e2 = phraseEnd(p);
              const sel = p.id === selection.phraseId;
              const left = msToTimelineX(s, scale);
              const width = Math.max(18, msToTimelineX(e2 - s, scale));

              return (
                <div
                  key={p.id}
                  data-phrase-clip={p.id}
                  className={`absolute top-0.5 bottom-0.5 rounded-md flex items-center overflow-visible transition-colors ${
                    sel
                      ? 'bg-[#EA580C] ring-2 ring-white z-10 shadow-md'
                      : 'bg-[#C2410C]/90 border border-white/15'
                  }`}
                  style={{ left, width }}
                  onPointerDown={(e) => {
                    onSelect({ phraseId: p.id, wordId: null });
                    setWordsTrackDismissedFor(null);
                    beginClipDrag(e, { kind: 'move', id: p.id, x0: e.clientX, start0: s });
                  }}
                >
                  {/* Alça esquerda de aparar (área de toque 44x44px invisível quando selecionado) */}
                  {sel && (
                    <span
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-11 flex items-center justify-center z-20 touch-none"
                      aria-label="Aparar início da legenda"
                      onPointerDown={(e) =>
                        beginClipDrag(e, {
                          kind: 'trimL',
                          id: p.id,
                          x0: e.clientX,
                          start0: s,
                          end0: e2,
                        })
                      }
                    >
                      <span className="w-2 h-8 rounded-l bg-white flex items-center justify-center shadow">
                        <span className="w-0.5 h-3.5 bg-[#0B0C10] rounded-full" />
                      </span>
                    </span>
                  )}

                  <span className="px-2 text-[11px] font-semibold text-white truncate pointer-events-none">
                    {phraseText(p)}
                  </span>

                  {/* Alça direita de aparar */}
                  {sel && (
                    <span
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-11 flex items-center justify-center z-20 touch-none"
                      aria-label="Aparar fim da legenda"
                      onPointerDown={(e) =>
                        beginClipDrag(e, {
                          kind: 'trimR',
                          id: p.id,
                          x0: e.clientX,
                          start0: s,
                          end0: e2,
                        })
                      }
                    >
                      <span className="w-2 h-8 rounded-r bg-white flex items-center justify-center shadow">
                        <span className="w-0.5 h-3.5 bg-[#0B0C10] rounded-full" />
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Sub-trilha Condicional de Palavras (apenas da frase selecionada) */}
          {showWordsTrack && selPhrase && (
            <div
              className="relative h-9 my-1 bg-white/[0.02] rounded"
              style={{ width: trackW }}
              aria-label="Palavras da frase selecionada"
            >
              {selPhrase.words.map((w) => {
                const wSel = w.id === selection.wordId;
                const wLeft = msToTimelineX(w.startMs, scale);
                const wWidth = Math.max(14, msToTimelineX(w.endMs - w.startMs, scale));
                return (
                  <div
                    key={w.id}
                    data-word-clip={w.id}
                    className={`absolute top-0.5 bottom-0.5 rounded flex items-center px-1.5 text-[10px] font-medium truncate ${
                      wSel
                        ? 'bg-[#00D4EB] text-[#041B1E] font-bold ring-1 ring-white z-10'
                        : w.role === 'key'
                          ? 'bg-[#4338CA] text-white border border-white/20'
                          : 'bg-[#312E81]/90 text-white/90 border border-white/10'
                    }`}
                    style={{ left: wLeft, width: wWidth }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onSelect({ phraseId: selPhrase.id, wordId: w.id });
                      seekMs(w.startMs + 1);
                    }}
                  >
                    {wSel && (
                      <span
                        className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-9 flex items-center justify-center z-20 touch-none"
                        onPointerDown={(e) =>
                          beginClipDrag(e, {
                            kind: 'wordL',
                            id: selPhrase.id,
                            wordId: w.id,
                            x0: e.clientX,
                            start0: w.startMs,
                            end0: w.endMs,
                          })
                        }
                      >
                        <span className="w-1.5 h-6 rounded-l bg-white" />
                      </span>
                    )}
                    <span className="truncate pointer-events-none">{w.text}</span>
                    {wSel && (
                      <span
                        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-9 flex items-center justify-center z-20 touch-none"
                        onPointerDown={(e) =>
                          beginClipDrag(e, {
                            kind: 'wordR',
                            id: selPhrase.id,
                            wordId: w.id,
                            x0: e.clientX,
                            start0: w.startMs,
                            end0: w.endMs,
                          })
                        }
                      >
                        <span className="w-1.5 h-6 rounded-r bg-white" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Controles laterais fixos à esquerda das trilhas (Áudio do clipe e Fechar sub-trilha de palavras) */}
      <div className="pointer-events-none absolute inset-y-0 left-1.5 flex flex-col justify-start pt-7 gap-1.5 z-20">
        <button
          type="button"
          onClick={() => setClipAudioVisual((v) => !v)}
          className="pointer-events-auto w-8 h-8 min-w-[32px] min-h-[32px] rounded-md bg-[#15171E]/90 border border-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-white shadow"
          aria-label={clipAudioVisual ? 'Áudio da trilha ativo' : 'Áudio da trilha oculto'}
          title="Indicador de áudio da trilha"
        >
          {clipAudioVisual ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
        {showWordsTrack && selPhrase && (
          <button
            type="button"
            onClick={() => {
              setWordsTrackDismissedFor(selPhrase.id);
              onSelect({ phraseId: selPhrase.id, wordId: null });
            }}
            className="pointer-events-auto mt-10 w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-[#1E212B] border border-white/20 flex items-center justify-center text-white shadow"
            aria-label="Fechar faixa de palavras"
            title="Fechar faixa de palavras"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Agulha Branca Vertical Fixa no Centro (Padrão CapCut Mobile) */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white z-30 shadow-[0_0_8px_rgba(255,255,255,0.65)]"
        aria-hidden="true"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-white -translate-x-[4px] -translate-y-0.5 shadow" />
      </div>
    </section>
  );
};
