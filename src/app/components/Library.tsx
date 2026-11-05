import { CaseSensitive, Layers, ListOrdered, Replace, UserRound, WholeWord } from 'lucide-react';
import React, { useState } from 'react';
import { countMatches, replaceAll } from '../../core/edit';
import { fontCss } from '../../core/fonts';
import { PRESETS, findPreset } from '../../core/presets';
import type { Phrase, Project } from '../../core/types';
import { PhraseList } from './PhraseList';
import type { Selection } from './Timeline';

type Props = {
  project: Project;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  currentMs: number;
  seekMs: (ms: number) => void;
  personPanel: React.ReactNode;
};

type Tab = 'frases' | 'modelos' | 'texto' | 'pessoa';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'frases', label: 'Frases', icon: <ListOrdered size={16} aria-hidden="true" /> },
  { id: 'modelos', label: 'Modelos', icon: <Layers size={16} aria-hidden="true" /> },
  { id: 'texto', label: 'Texto', icon: <Replace size={16} aria-hidden="true" /> },
  { id: 'pessoa', label: 'Pessoa', icon: <UserRound size={16} aria-hidden="true" /> },
];

const applyPreset = (p: Phrase, id: string, project: Project): Phrase => {
  const np = findPreset(id, project.customPresets);
  return { ...p, presetId: np.id, x: np.position.x, y: np.position.y, roleStyles: undefined, animation: undefined, highlight: undefined };
};

/** Painel da esquerda: lista de frases, galeria de modelos, buscar/substituir e análise de pessoa. */
export const Library: React.FC<Props> = ({ project, apply, selection, onSelect, currentMs, seekMs, personPanel }) => {
  const [tab, setTab] = useState<Tab>('frases');
  const [find, setFind] = useState('');
  const [repl, setRepl] = useState('');
  const [cs, setCs] = useState(false);
  const [ww, setWw] = useState(true);
  const [msg, setMsg] = useState('');
  const matches = countMatches(project, find, { caseSensitive: cs, wholeWord: ww });
  const sel = project.phrases.find((p) => p.id === selection.phraseId);

  return (
    <div className="library">
      <div className="lib-tabs" role="tablist" aria-label="Biblioteca">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="lib-body">
        {tab === 'frases' && (
          <PhraseList
            project={project}
            apply={apply}
            selectedId={selection.phraseId}
            onSelect={(id) => onSelect({ phraseId: id, wordId: null })}
            currentMs={currentMs}
            seekMs={seekMs}
          />
        )}

        {tab === 'modelos' && (
          <div className="presets">
            <p className="muted small">
              {sel ? 'Clique para aplicar na frase selecionada.' : 'Selecione uma frase para aplicar, ou use “Em todas”.'}
            </p>
            {[...PRESETS, ...project.customPresets].map((pr) => {
              const key = pr.roles.key;
              const small = pr.roles.small;
              const fill = key.fill.type === 'solid' ? key.fill.color : key.fill.colors[1] ?? key.fill.colors[0];
              return (
                <div key={pr.id} className={`preset-card ${sel?.presetId === pr.id ? 'on' : ''}`}>
                  <button
                    className="preset-prev"
                    disabled={!sel}
                    onClick={() => sel && apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => (p.id === sel.id ? applyPreset(p, pr.id, proj) : p)) }))}
                    aria-label={`Aplicar modelo ${pr.name} na frase selecionada`}
                  >
                    <span style={{ fontFamily: fontCss(small.fontFamily), fontWeight: small.fontWeight, fontStyle: small.italic ? 'italic' : 'normal', color: '#ddd', fontSize: 12 }}>
                      {small.uppercase ? 'VOCÊ NÃO' : 'você não'}
                    </span>
                    <span
                      style={{
                        fontFamily: fontCss(key.fontFamily),
                        fontWeight: Math.min(key.fontWeight, 900),
                        fontStyle: key.italic ? 'italic' : 'normal',
                        color: fill,
                        fontSize: 24,
                        lineHeight: 1.1,
                        textShadow: key.glow ? `0 0 10px ${key.glow.color}` : undefined,
                      }}
                    >
                      {key.uppercase ? 'VENDE' : 'vende'}
                    </span>
                  </button>
                  <div className="preset-meta">
                    <strong>{pr.name}</strong>
                    <button
                      className="small-btn"
                      onClick={() => apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => applyPreset(p, pr.id, proj)) }))}
                    >
                      Em todas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'texto' && (
          <div className="findrep">
            <h4>Buscar e substituir</h4>
            <label className="stack-label">
              Buscar
              <input className="text" value={find} onChange={(e) => (setFind(e.target.value), setMsg(''))} />
            </label>
            <label className="stack-label">
              Trocar por
              <input className="text" value={repl} onChange={(e) => setRepl(e.target.value)} />
            </label>
            <div className="row">
              <button className={`icon ${cs ? 'on' : ''}`} aria-pressed={cs} onClick={() => setCs((v) => !v)} title="Diferenciar maiúsculas" aria-label="Diferenciar maiúsculas">
                <CaseSensitive size={16} aria-hidden="true" />
              </button>
              <button className={`icon ${ww ? 'on' : ''}`} aria-pressed={ww} onClick={() => setWw((v) => !v)} title="Palavra inteira" aria-label="Palavra inteira">
                <WholeWord size={16} aria-hidden="true" />
              </button>
              <span className="muted">{find ? `${matches} ocorrência(s)` : ''}</span>
            </div>
            <button
              className="primary"
              disabled={!find || !matches}
              onClick={() => {
                let n = 0;
                apply((proj) => {
                  const r = replaceAll(proj, find, repl, { caseSensitive: cs, wholeWord: ww });
                  n = r.count;
                  return r.project;
                });
                setMsg(`Trocado ${n || matches}×`);
              }}
            >
              Substituir tudo
            </button>
            {msg && <p className="muted small" role="status">{msg}</p>}

            <h4>Texto em massa</h4>
            <div className="row wrap">
              <button onClick={() => apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => ({ ...p, words: p.words.map((w) => ({ ...w, text: w.text.replace(/[.,;:!?…]+$/u, '') })) })) }))}>
                Tirar pontuação final
              </button>
              <button onClick={() => apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => ({ ...p, roleStyles: { ...p.roleStyles, small: { ...p.roleStyles?.small, uppercase: true }, normal: { ...p.roleStyles?.normal, uppercase: true }, key: { ...p.roleStyles?.key, uppercase: true } } })) }))}>
                TUDO EM CAIXA ALTA
              </button>
            </div>
          </div>
        )}

        {tab === 'pessoa' && personPanel}
      </div>
    </div>
  );
};
