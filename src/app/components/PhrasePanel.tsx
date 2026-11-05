import { Link2, Link2Off, RotateCcw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { setWordTime } from '../../core/edit';
import { newId, phraseText } from '../../core/grouping';
import { findPreset, resolveAnimation, resolveWordStyle } from '../../core/presets';
import { ENTRANCES, EXITS, type Animation, type Phrase, type Preset, type Project, type Role, type TextStyle, type Word } from '../../core/types';
import { StyleEditor } from './StyleEditor';

type Props = {
  project: Project;
  phrase: Phrase;
  wordId: string | null;
  onSelectWord: (id: string | null) => void;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
};

const ROLE_LABEL: Record<Role, string> = { small: 'Ligação', normal: 'Normal', key: 'Destaque' };
const ENTRANCE_LABEL: Record<string, string> = {
  blurUp: 'Desfoque + sobe',
  pop: 'Pop',
  fade: 'Fade',
  slideUp: 'Desliza p/ cima',
  zoomIn: 'Zoom',
  none: 'Corte seco',
};
const EXIT_LABEL: Record<string, string> = { blurOut: 'Desfoque', fade: 'Fade', zoomOut: 'Zoom', none: 'Corte seco' };
const MODE_LABEL = { word: 'Palavra a palavra (acumula)', phrase: 'Frase inteira', single: 'Uma palavra por vez' };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }> = (p) => {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    setDraft((d) => (d !== null && d.trim() !== '' && Number(d) === p.value ? d : null));
  }, [p.value]);
  const commit = (raw: string | null) => {
    if (raw !== null && raw.trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) p.onChange(clamp(n, p.min, p.max));
    }
    setDraft(null);
  };
  return (
    <label className="field">
      <span>{p.label}</span>
      <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={p.value} onChange={(e) => p.onChange(clamp(Number(e.target.value), p.min, p.max))} />
      <input
        type="number"
        aria-label={p.label}
        min={p.min}
        max={p.max}
        step={p.step ?? 1}
        value={draft ?? Number(p.value.toFixed(3))}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw.trim() === '') return;
          const n = Number(raw);
          if (Number.isFinite(n) && n >= p.min && n <= p.max) p.onChange(n);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
};

type Tab = 'frase' | 'estilo' | 'animacao' | 'destaque' | 'palavra';
const TABS: { id: Tab; label: string }[] = [
  { id: 'frase', label: 'Frase' },
  { id: 'estilo', label: 'Estilo' },
  { id: 'animacao', label: 'Animação' },
  { id: 'destaque', label: 'Karaokê' },
  { id: 'palavra', label: 'Palavra' },
];

/** Inspetor: tudo da frase selecionada e, na aba Palavra, de cada palavra individual. */
export const PhrasePanel: React.FC<Props> = ({ project, phrase, wordId, onSelectWord, apply }) => {
  const [tab, setTab] = useState<Tab>(() => (wordId ? 'palavra' : 'frase'));
  useEffect(() => {
    if (wordId) setTab('palavra');
  }, [wordId]);
  const [role, setRole] = useState<Role>('key');
  const [lockScale, setLockScale] = useState(true);
  const preset = findPreset(phrase.presetId, project.customPresets);
  const anim = resolveAnimation(preset, phrase.animation);
  const hasMask = Boolean(project.video.mask);

  const set = (patch: Partial<Phrase> | ((p: Phrase) => Phrase), merge = true) =>
    apply(
      (proj) => ({
        ...proj,
        phrases: proj.phrases.map((p) => (p.id === phrase.id ? (typeof patch === 'function' ? patch(p) : { ...p, ...patch }) : p)),
      }),
      merge,
    );
  const setAnim = (patch: Partial<Animation>, merge = true) => set((p) => ({ ...p, animation: { ...p.animation, ...patch } }), merge);
  const setRoleStyle = (r: Role, patch: Partial<TextStyle>) =>
    set((p) => ({ ...p, roleStyles: { ...p.roleStyles, [r]: { ...p.roleStyles?.[r], ...patch } } }));
  const setWord = (id: string, patch: Partial<Word>, merge = true) =>
    set((p) => ({ ...p, words: p.words.map((w) => (w.id === id ? { ...w, ...patch } : w)) }), merge);

  const applyToSamePreset = () =>
    apply((proj) => ({
      ...proj,
      phrases: proj.phrases.map((p) =>
        p.presetId === phrase.presetId && p.id !== phrase.id
          ? {
              ...p,
              roleStyles: phrase.roleStyles,
              animation: phrase.animation,
              highlight: phrase.highlight,
              scale: phrase.scale,
              rotation: phrase.rotation,
              rotateX: phrase.rotateX,
              rotateY: phrase.rotateY,
              align: phrase.align,
            }
          : p,
      ),
    }));

  const applyToAll = () =>
    apply((proj) => ({
      ...proj,
      phrases: proj.phrases.map((p) =>
        p.id === phrase.id
          ? p
          : {
              ...p,
              presetId: phrase.presetId,
              roleStyles: phrase.roleStyles,
              animation: phrase.animation,
              highlight: phrase.highlight,
              scale: phrase.scale,
              rotation: phrase.rotation,
              rotateX: phrase.rotateX,
              rotateY: phrase.rotateY,
              align: phrase.align,
            },
      ),
    }));

  const saveAsPreset = () => {
    const name = window.prompt('Nome do modelo', `${preset.name} (meu)`);
    if (!name) return;
    const roles = (['small', 'normal', 'key'] as Role[]).reduce(
      (acc, r) => ({ ...acc, [r]: resolveWordStyle(preset, r, phrase.roleStyles) }),
      {} as Record<Role, TextStyle>,
    );
    const np: Preset = {
      ...preset,
      id: newId('preset'),
      name: name.slice(0, 60),
      description: 'Modelo personalizado',
      roles,
      animation: anim,
      align: phrase.align ?? preset.align,
      position: { x: phrase.x, y: phrase.y },
    };
    apply((proj) => ({
      ...proj,
      customPresets: [...proj.customPresets, np],
      phrases: proj.phrases.map((p) => (p.id === phrase.id ? { ...p, presetId: np.id, roleStyles: undefined, animation: undefined } : p)),
    }));
  };

  const word = phrase.words.find((w) => w.id === wordId) ?? null;
  const hl = phrase.highlight ?? null;
  const hlBase = resolveWordStyle(preset, 'key', phrase.roleStyles);

  return (
    <div className="inspector-body">
      <div className="inspector-title">
        <strong title={phraseText(phrase)}>{phraseText(phrase) || 'Frase vazia'}</strong>
        <span className="muted">{preset.name}</span>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => {
              if (t.id === 'palavra' && !word) onSelectWord(phrase.words[0]?.id ?? null);
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'frase' && (
        <div>
          <p className="muted small">{preset.description}</p>
          <h4>Transformar</h4>
          <Slider label="Posição X" value={phrase.x} min={0} max={1} step={0.005} onChange={(v) => set({ x: v })} />
          <Slider label="Posição Y" value={phrase.y} min={0} max={1} step={0.005} onChange={(v) => set({ y: v })} />
          <Slider label="Escala" value={phrase.scale} min={0.2} max={3} step={0.05} onChange={(v) => set({ scale: v })} />
          <Slider label="Rotação" value={phrase.rotation} min={-180} max={180} onChange={(v) => set({ rotation: v })} />
          <Slider label="3D X" value={phrase.rotateX} min={-70} max={70} onChange={(v) => set({ rotateX: v })} />
          <Slider label="3D Y" value={phrase.rotateY} min={-70} max={70} onChange={(v) => set({ rotateY: v })} />
          <div className="field">
            <span>Alinhamento</span>
            <div className="seg field-wide" role="group" aria-label="Alinhamento">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} className={(phrase.align ?? preset.align) === a ? 'on' : ''} aria-pressed={(phrase.align ?? preset.align) === a} onClick={() => set({ align: a }, false)}>
                  {a === 'left' ? 'Esq.' : a === 'center' ? 'Centro' : 'Dir.'}
                </button>
              ))}
            </div>
          </div>

          <h4>Profundidade</h4>
          <label className="check">
            <input type="checkbox" checked={!!phrase.behind} disabled={!hasMask} onChange={(e) => set({ behind: e.target.checked }, false)} />
            Legenda atrás da pessoa
          </label>
          {!hasMask && <p className="muted small">Faça a análise de pessoa no painel “Pessoa” para liberar.</p>}

          <h4>Modelo</h4>
          <div className="row wrap">
            <button onClick={applyToSamePreset}>Aplicar nas frases deste modelo</button>
            <button onClick={applyToAll}>Aplicar em todas</button>
            <button onClick={saveAsPreset}>Salvar como modelo</button>
            <button
              onClick={() =>
                set({ roleStyles: undefined, animation: undefined, highlight: undefined, scale: 1, rotation: 0, rotateX: 0, rotateY: 0, align: undefined, x: preset.position.x, y: preset.position.y }, false)
              }
            >
              <RotateCcw size={14} aria-hidden="true" /> Restaurar
            </button>
          </div>
        </div>
      )}

      {tab === 'estilo' && (
        <div>
          <div className="seg" role="group" aria-label="Papel da palavra">
            {(['small', 'normal', 'key'] as Role[]).map((r) => (
              <button key={r} className={role === r ? 'on' : ''} aria-pressed={role === r} onClick={() => setRole(r)}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="muted small">Muda todas as palavras “{ROLE_LABEL[role]}” desta frase.</p>
          <StyleEditor
            style={resolveWordStyle(preset, role, phrase.roleStyles)}
            sample={phrase.words.find((w) => w.role === role)?.text}
            onChange={(patch) => setRoleStyle(role, patch)}
          />
        </div>
      )}

      {tab === 'animacao' && (
        <div>
          <label className="field">
            <span>Revelar</span>
            <select value={anim.mode} onChange={(e) => setAnim({ mode: e.target.value as Animation['mode'] }, false)}>
              {Object.entries(MODE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Entrada</span>
            <select value={anim.entrance} onChange={(e) => setAnim({ entrance: e.target.value as Animation['entrance'] }, false)}>
              {ENTRANCES.map((k) => (
                <option key={k} value={k}>
                  {ENTRANCE_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Saída</span>
            <select value={anim.exit} onChange={(e) => setAnim({ exit: e.target.value as Animation['exit'] }, false)}>
              {EXITS.map((k) => (
                <option key={k} value={k}>
                  {EXIT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <Slider label="Duração (ms)" value={anim.durationMs} min={0} max={1500} step={10} onChange={(v) => setAnim({ durationMs: v })} />
          <Slider label="Intervalo (ms)" value={anim.staggerMs} min={0} max={500} step={10} onChange={(v) => setAnim({ staggerMs: v })} />
          <Slider label="Segurar (ms)" value={anim.holdMs} min={0} max={1500} step={50} onChange={(v) => setAnim({ holdMs: v })} />
        </div>
      )}

      {tab === 'destaque' && (
        <div>
          <label className="check">
            <input
              type="checkbox"
              checked={!!hl}
              onChange={(e) =>
                set({ highlight: e.target.checked ? { fill: { type: 'solid', color: '#FFE14D' } } : null }, false)
              }
            />
            Destacar a palavra que está sendo falada
          </label>
          <p className="muted small">Estilo karaokê (CapCut/Submagic): só os campos alterados aqui mudam na palavra ativa.</p>
          {hl && (
            <StyleEditor
              style={{ ...hlBase, ...hl }}
              sample={phrase.words[0]?.text}
              onChange={(patch) => set((p) => ({ ...p, highlight: { ...p.highlight, ...patch } }))}
            />
          )}
        </div>
      )}

      {tab === 'palavra' && (
        <div>
          <div className="words" role="listbox" aria-label="Palavras da frase">
            {phrase.words.map((w) => (
              <button
                key={w.id}
                role="option"
                aria-selected={w.id === wordId}
                className={`word ${w.role} ${w.id === wordId ? 'on' : ''}`}
                onClick={() => onSelectWord(w.id)}
              >
                {w.text}
              </button>
            ))}
          </div>
          {!word && <p className="muted small">Escolha uma palavra (ou clique nela no monitor/timeline).</p>}
          {word && (
            <div>
              <label className="field">
                <span>Texto</span>
                <input
                  className="text field-wide"
                  value={word.text}
                  onChange={(e) => setWord(word.id, { text: e.target.value.slice(0, 200) })}
                />
              </label>
              <div className="field">
                <span>Papel</span>
                <div className="seg field-wide" role="group" aria-label="Papel">
                  {(['small', 'normal', 'key'] as Role[]).map((r) => (
                    <button key={r} className={word.role === r ? 'on' : ''} aria-pressed={word.role === r} onClick={() => setWord(word.id, { role: r }, false)}>
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
              <h4>Tempo</h4>
              <Slider label="Início (ms)" value={word.startMs} min={0} max={project.video.durationMs} step={10} onChange={(v) => set((p) => setWordTime(p, word.id, v, word.endMs))} />
              <Slider label="Fim (ms)" value={word.endMs} min={0} max={project.video.durationMs} step={10} onChange={(v) => set((p) => setWordTime(p, word.id, word.startMs, v))} />
              <h4>Transformar só esta palavra</h4>
              <Slider label="Posição X" value={word.dx ?? 0} min={-800} max={800} onChange={(v) => setWord(word.id, { dx: v })} />
              <Slider label="Posição Y" value={word.dy ?? 0} min={-800} max={800} onChange={(v) => setWord(word.id, { dy: v })} />
              <Slider label="Rotação" value={word.rotation ?? 0} min={-180} max={180} onChange={(v) => setWord(word.id, { rotation: v })} />
              <div className="scale-row">
                <div className="scale-sliders">
                  <Slider
                    label="Escala horiz."
                    value={word.scaleX ?? 1}
                    min={0.1}
                    max={5}
                    step={0.01}
                    onChange={(v) => setWord(word.id, lockScale ? { scaleX: v, scaleY: clamp(v * ((word.scaleY ?? 1) / (word.scaleX || 1)), 0.1, 5) } : { scaleX: v })}
                  />
                  <Slider
                    label="Escala vert."
                    value={word.scaleY ?? 1}
                    min={0.1}
                    max={5}
                    step={0.01}
                    onChange={(v) => setWord(word.id, lockScale ? { scaleY: v, scaleX: clamp(v * ((word.scaleX ?? 1) / (word.scaleY || 1)), 0.1, 5) } : { scaleY: v })}
                  />
                </div>
                <button
                  className={`icon ${lockScale ? 'on' : ''}`}
                  aria-pressed={lockScale}
                  aria-label={lockScale ? 'Proporção travada' : 'Proporção livre'}
                  title={lockScale ? 'Proporção travada' : 'Proporção livre'}
                  onClick={() => setLockScale((v) => !v)}
                >
                  {lockScale ? <Link2 size={16} aria-hidden="true" /> : <Link2Off size={16} aria-hidden="true" />}
                </button>
              </div>
              <h4>Estilo só desta palavra</h4>
              <StyleEditor
                style={resolveWordStyle(preset, word.role, phrase.roleStyles, word.style)}
                sample={word.text}
                onChange={(patch) => setWord(word.id, { style: { ...word.style, ...patch } })}
              />
              <button onClick={() => setWord(word.id, { style: undefined, dx: 0, dy: 0, rotation: 0, scaleX: 1, scaleY: 1 }, false)}>
                <RotateCcw size={14} aria-hidden="true" /> Limpar ajustes da palavra
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
