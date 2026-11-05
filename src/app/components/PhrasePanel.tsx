import React, { useState } from 'react';
import { newId } from '../../core/grouping';
import { findPreset, resolveAnimation, resolveWordStyle } from '../../core/presets';
import { ENTRANCES, EXITS, type Animation, type Phrase, type Preset, type Project, type Role, type TextStyle, type Word } from '../../core/types';
import { StyleEditor } from './StyleEditor';

type Props = {
  project: Project;
  phrase: Phrase;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
};

const ROLE_LABEL: Record<Role, string> = { small: 'Ligação (pequena)', normal: 'Normal', key: 'Palavra-chave' };
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

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }> = (p) => (
  <label className="field">
    <span>{p.label}</span>
    <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    <input type="number" step={p.step ?? 1} value={Number(p.value.toFixed(3))} onChange={(e) => p.onChange(Number(e.target.value))} />
  </label>
);

export const PhrasePanel: React.FC<Props> = ({ project, phrase, apply }) => {
  const [tab, setTab] = useState<'frase' | 'estilo' | 'palavras'>('frase');
  const [role, setRole] = useState<Role>('key');
  const [wordId, setWordId] = useState<string | null>(null);
  const preset = findPreset(phrase.presetId, project.customPresets);
  const anim = resolveAnimation(preset, phrase.animation);

  const set = (patch: Partial<Phrase> | ((p: Phrase) => Phrase), merge = true) =>
    apply(
      (proj) => ({
        ...proj,
        phrases: proj.phrases.map((p) => (p.id === phrase.id ? (typeof patch === 'function' ? patch(p) : { ...p, ...patch }) : p)),
      }),
      merge,
    );
  const setAnim = (patch: Partial<Animation>) => set((p) => ({ ...p, animation: { ...p.animation, ...patch } }));
  const setRoleStyle = (r: Role, patch: Partial<TextStyle>) =>
    set((p) => ({ ...p, roleStyles: { ...p.roleStyles, [r]: { ...p.roleStyles?.[r], ...patch } } }));
  const setWord = (id: string, patch: Partial<Word>) =>
    set((p) => ({ ...p, words: p.words.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));

  /** Aplica o visual desta frase em todas as frases do mesmo modelo. */
  const applyToSamePreset = () =>
    apply((proj) => ({
      ...proj,
      phrases: proj.phrases.map((p) =>
        p.presetId === phrase.presetId && p.id !== phrase.id
          ? { ...p, roleStyles: phrase.roleStyles, animation: phrase.animation, scale: phrase.scale, rotation: phrase.rotation, rotateX: phrase.rotateX, rotateY: phrase.rotateY, align: phrase.align }
          : p,
      ),
    }));

  /** Salva a frase atual como novo modelo reutilizável. */
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

  return (
    <div className="phrase-panel">
      <div className="tabs">
        {(['frase', 'estilo', 'palavras'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'frase' ? 'Frase' : t === 'estilo' ? 'Estilo' : 'Palavras'}
          </button>
        ))}
      </div>

      {tab === 'frase' && (
        <div>
          <p className="muted">{preset.description}</p>
          <Slider label="Posição X" value={phrase.x} min={0} max={1} step={0.005} onChange={(v) => set({ x: v })} />
          <Slider label="Posição Y" value={phrase.y} min={0} max={1} step={0.005} onChange={(v) => set({ y: v })} />
          <Slider label="Escala" value={phrase.scale} min={0.2} max={3} step={0.05} onChange={(v) => set({ scale: v })} />
          <Slider label="Rotação" value={phrase.rotation} min={-180} max={180} onChange={(v) => set({ rotation: v })} />
          <Slider label="Inclinação 3D X" value={phrase.rotateX} min={-70} max={70} onChange={(v) => set({ rotateX: v })} />
          <Slider label="Inclinação 3D Y" value={phrase.rotateY} min={-70} max={70} onChange={(v) => set({ rotateY: v })} />
          <label className="field">
            <span>Alinhamento</span>
            <select value={phrase.align ?? preset.align} onChange={(e) => set({ align: e.target.value as Phrase['align'] })}>
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </label>

          <h4>Animação</h4>
          <label className="field">
            <span>Revelar</span>
            <select value={anim.mode} onChange={(e) => setAnim({ mode: e.target.value as Animation['mode'] })}>
              {Object.entries(MODE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Entrada</span>
            <select value={anim.entrance} onChange={(e) => setAnim({ entrance: e.target.value as Animation['entrance'] })}>
              {ENTRANCES.map((k) => (
                <option key={k} value={k}>
                  {ENTRANCE_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Saída</span>
            <select value={anim.exit} onChange={(e) => setAnim({ exit: e.target.value as Animation['exit'] })}>
              {EXITS.map((k) => (
                <option key={k} value={k}>
                  {EXIT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <Slider label="Duração (ms)" value={anim.durationMs} min={0} max={1500} step={10} onChange={(v) => setAnim({ durationMs: v })} />
          <Slider label="Intervalo palavras (ms)" value={anim.staggerMs} min={0} max={500} step={10} onChange={(v) => setAnim({ staggerMs: v })} />
          <Slider label="Segurar no fim (ms)" value={anim.holdMs} min={0} max={1500} step={50} onChange={(v) => setAnim({ holdMs: v })} />

          <div className="row wrap">
            <button onClick={applyToSamePreset}>Aplicar visual nas frases deste modelo</button>
            <button onClick={saveAsPreset}>Salvar como modelo</button>
            <button onClick={() => set({ roleStyles: undefined, animation: undefined, scale: 1, rotation: 0, rotateX: 0, rotateY: 0, align: undefined, x: preset.position.x, y: preset.position.y }, false)}>
              Restaurar modelo
            </button>
          </div>
        </div>
      )}

      {tab === 'estilo' && (
        <div>
          <div className="row">
            {(['small', 'normal', 'key'] as Role[]).map((r) => (
              <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <StyleEditor style={resolveWordStyle(preset, role, phrase.roleStyles)} onChange={(patch) => setRoleStyle(role, patch)} />
        </div>
      )}

      {tab === 'palavras' && (
        <div>
          <div className="words">
            {phrase.words.map((w) => (
              <button key={w.id} className={`word ${w.role} ${w.id === wordId ? 'on' : ''}`} onClick={() => setWordId(w.id)}>
                {w.text}
              </button>
            ))}
          </div>
          {word && (
            <div>
              <label className="field">
                <span>Papel</span>
                <select value={word.role} onChange={(e) => setWord(word.id, { role: e.target.value as Role })}>
                  {(['small', 'normal', 'key'] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <Slider label="Início (ms)" value={word.startMs} min={0} max={project.video.durationMs} step={10} onChange={(v) => setWord(word.id, { startMs: v })} />
              <Slider label="Fim (ms)" value={word.endMs} min={0} max={project.video.durationMs} step={10} onChange={(v) => setWord(word.id, { endMs: v })} />
              <Slider label="Deslocar X" value={word.dx ?? 0} min={-500} max={500} onChange={(v) => setWord(word.id, { dx: v })} />
              <Slider label="Deslocar Y" value={word.dy ?? 0} min={-500} max={500} onChange={(v) => setWord(word.id, { dy: v })} />
              <Slider label="Girar" value={word.rotation ?? 0} min={-180} max={180} onChange={(v) => setWord(word.id, { rotation: v })} />
              <h4>Estilo só desta palavra</h4>
              <StyleEditor
                style={resolveWordStyle(preset, word.role, phrase.roleStyles, word.style)}
                onChange={(patch) => setWord(word.id, { style: { ...word.style, ...patch } })}
              />
              <button onClick={() => setWord(word.id, { style: undefined, dx: 0, dy: 0, rotation: 0 })}>Limpar estilo da palavra</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
