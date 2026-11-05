import React, { useEffect, useRef } from 'react';
import { buildPhrase, mergeWithNext, phraseEnd, phraseStart, phraseText, retextPhrase, shiftPhrase, splitPhrase } from '../../core/grouping';
import { PRESETS, findPreset } from '../../core/presets';
import type { Phrase, Project } from '../../core/types';

type Props = {
  project: Project;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentMs: number;
  seekMs: (ms: number) => void;
};

const fmt = (ms: number) => {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

export const PhraseList: React.FC<Props> = ({ project, apply, selectedId, onSelect, currentMs, seekMs }) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const activeId = project.phrases.find((p) => currentMs >= phraseStart(p) && currentMs < phraseEnd(p) + 300)?.id;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const update = (id: string, fn: (p: Phrase) => Phrase, merge = false) =>
    apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => (p.id === id ? fn(p) : p)) }), merge);

  const addAtCursor = () =>
    apply((proj) => {
      const ph = buildPhrase([{ text: 'Texto', startMs: currentMs, endMs: currentMs + 800 }], 'p1-editorial', proj.customPresets);
      const phrases = [...proj.phrases, ph].sort((a, b) => phraseStart(a) - phraseStart(b));
      onSelect(ph.id);
      return { ...proj, phrases };
    });

  return (
    <div className="phrase-list">
      <div className="panel-head">
        <strong>Frases ({project.phrases.length})</strong>
        <button onClick={addAtCursor} title="Nova frase no tempo atual">+ frase</button>
      </div>
      {project.phrases.map((p) => {
        const preset = findPreset(p.presetId, project.customPresets);
        const selected = p.id === selectedId;
        return (
          <div
            key={p.id}
            ref={p.id === activeId ? activeRef : undefined}
            className={`phrase ${selected ? 'selected' : ''} ${p.id === activeId ? 'active' : ''}`}
            onClick={() => {
              onSelect(p.id);
              seekMs(phraseStart(p) + 1);
            }}
          >
            <div className="row">
              <span className="time">
                {fmt(phraseStart(p))}–{fmt(phraseEnd(p))}
              </span>
              <select
                value={preset.id}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const np = findPreset(e.target.value, project.customPresets);
                  update(p.id, (ph) => ({ ...ph, presetId: np.id, x: np.position.x, y: np.position.y, roleStyles: undefined }));
                }}
              >
                {[...PRESETS, ...project.customPresets].map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="text"
              defaultValue={phraseText(p)}
              key={phraseText(p)}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                if (e.target.value !== phraseText(p)) update(p.id, (ph) => retextPhrase(ph, e.target.value));
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            {selected && (
              <div className="row actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => update(p.id, (ph) => shiftPhrase(ph, -100))} title="Adiantar 0,1 s">
                  −0,1s
                </button>
                <button onClick={() => update(p.id, (ph) => shiftPhrase(ph, 100))} title="Atrasar 0,1 s">
                  +0,1s
                </button>
                <button
                  disabled={p.words.length < 2}
                  onClick={() => apply((proj) => ({ ...proj, phrases: splitPhrase(proj.phrases, p.id, Math.ceil(p.words.length / 2)) }))}
                  title="Dividir no meio"
                >
                  Dividir
                </button>
                <button onClick={() => apply((proj) => ({ ...proj, phrases: mergeWithNext(proj.phrases, p.id) }))} title="Juntar com a próxima">
                  Juntar ↓
                </button>
                <button className="danger" onClick={() => apply((proj) => ({ ...proj, phrases: proj.phrases.filter((x) => x.id !== p.id) }))}>
                  Apagar
                </button>
              </div>
            )}
          </div>
        );
      })}
      {!project.phrases.length && <p className="muted">Sem frases. Use “+ frase” no ponto do vídeo.</p>}
    </div>
  );
};
