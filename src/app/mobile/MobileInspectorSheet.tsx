import {
  Check,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Scissors,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { setWordTime } from '../../core/edit';
import { suggestEmojis, suggestForText, withEmoji } from '../../core/emojis';
import { FONTS, fontCss, fontDef, type FontKey } from '../../core/fonts';
import { newId, phraseText, retextPhrase, splitPhrase } from '../../core/grouping';
import { PRESETS, findPreset, resolveAnimation, resolveWordStyle } from '../../core/presets';
import {
  ENTRANCES,
  EXITS,
  type Animation,
  type Phrase,
  type Preset,
  type Project,
  type Role,
  type TextStyle,
  type Word,
} from '../../core/types';
import { Slider } from '../components/PhrasePanel';
import { StyleEditor } from '../components/StyleEditor';
import { MobileBottomSheet } from './MobileBottomSheet';

export type InspectorTab =
  | 'modelos'
  | 'fontes'
  | 'estilos'
  | 'efeitos'
  | 'animacoes'
  | 'palavra';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'modelos', label: 'Modelos' },
  { id: 'fontes', label: 'Fontes' },
  { id: 'estilos', label: 'Estilos' },
  { id: 'efeitos', label: 'Efeitos' },
  { id: 'animacoes', label: 'Animações' },
  { id: 'palavra', label: 'Palavra' },
];

const ROLE_LABEL: Record<Role, string> = {
  key: 'Destaque',
  normal: 'Normal',
  small: 'Ligação',
};

const ENTRANCE_LABEL: Record<string, string> = {
  blurUp: 'Desfoque + sobe',
  pop: 'Pop',
  fade: 'Fade',
  slideUp: 'Desliza p/ cima',
  zoomIn: 'Zoom',
  none: 'Corte seco',
};
const EXIT_LABEL: Record<string, string> = {
  blurOut: 'Desfoque',
  fade: 'Fade',
  zoomOut: 'Zoom',
  none: 'Corte seco',
};
const MODE_LABEL = {
  word: 'Palavra a palavra (acumula)',
  phrase: 'Frase inteira',
  single: 'Uma palavra por vez',
};

const applyPresetToPhrase = (p: Phrase, id: string, project: Project): Phrase => {
  const np = findPreset(id, project.customPresets);
  return {
    ...p,
    presetId: np.id,
    x: np.position.x,
    y: np.position.y,
    rotateX: np.rotateX ?? 0,
    rotateY: np.rotateY ?? 0,
    roleStyles: undefined,
    animation: undefined,
    highlight: undefined,
  };
};

export type MobileInspectorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  phrase: Phrase | null;
  wordId: string | null;
  onSelectWord: (wordId: string | null) => void;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  initialTab?: InspectorTab;
};

export const MobileInspectorSheet: React.FC<MobileInspectorSheetProps> = ({
  open,
  onOpenChange,
  project,
  phrase,
  wordId,
  onSelectWord,
  apply,
  initialTab = 'modelos',
}) => {
  const [tab, setTab] = useState<InspectorTab>(initialTab);
  const [role, setRole] = useState<Role>('key');
  const [applyAllCaptions, setApplyAllCaptions] = useState<boolean>(true);
  const [expandedText, setExpandedText] = useState<boolean>(false);
  const [textDraft, setTextDraft] = useState<string>('');
  const [savingPresetOpen, setSavingPresetOpen] = useState<boolean>(false);
  const [customPresetName, setCustomPresetName] = useState<string>('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (phrase) {
      setTextDraft(phraseText(phrase));
    }
  }, [phrase?.id, phrase ? phraseText(phrase) : '']);

  if (!phrase) {
    // Se abrir em Modelos sem frase selecionada, permite aplicar modelo em todas as frases
    return (
      <MobileBottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Modelos de Legenda"
        onConfirm={() => onOpenChange(false)}
        maxHeight="64dvh"
      >
        <div className="grid grid-cols-3 gap-2">
          {[...PRESETS, ...project.customPresets].map((pr) => {
            const key = pr.roles.key;
            const small = pr.roles.small;
            const fill =
              key.fill.type === 'solid'
                ? key.fill.color
                : key.fill.colors[1] ?? key.fill.colors[0];
            return (
              <button
                key={pr.id}
                type="button"
                onClick={() =>
                  apply((proj) => ({
                    ...proj,
                    phrases: proj.phrases.map((p) => applyPresetToPhrase(p, pr.id, proj)),
                  }))
                }
                className="rounded-xl bg-[#1E212B] border border-white/10 p-2.5 flex flex-col items-center justify-center min-h-[76px]"
              >
                <span
                  style={{
                    fontFamily: fontCss(small.fontFamily),
                    fontWeight: small.fontWeight,
                    color: '#cbd5e1',
                    fontSize: 10,
                  }}
                >
                  {small.uppercase ? 'VOCÊ NÃO' : 'você não'}
                </span>
                <span
                  style={{
                    fontFamily: fontCss(key.fontFamily),
                    fontWeight: Math.min(key.fontWeight, 900),
                    fontStyle: key.italic ? 'italic' : 'normal',
                    color: fill,
                    fontSize: 17,
                    lineHeight: 1.1,
                  }}
                >
                  {key.uppercase ? 'VENDE' : 'vende'}
                </span>
                <span className="mt-1 text-[10px] text-[#9CA3AF] truncate max-w-full">
                  {pr.name}
                </span>
              </button>
            );
          })}
        </div>
      </MobileBottomSheet>
    );
  }

  const preset = findPreset(phrase.presetId, project.customPresets);
  const anim = resolveAnimation(preset, phrase.animation);
  const hasMask = Boolean(project.video.mask);
  const word = phrase.words.find((w) => w.id === wordId) ?? null;
  const activeStyle = resolveWordStyle(preset, role, phrase.roleStyles);
  const phraseEmojis = suggestForText(phrase.words.map((w) => w.text));
  const wordEmojis = word ? suggestEmojis(word.text) : [];
  const hl = phrase.highlight ?? null;
  const hlBase = resolveWordStyle(preset, 'key', phrase.roleStyles);

  const setPhrase = (patch: Partial<Phrase> | ((p: Phrase) => Phrase), merge = true) =>
    apply(
      (proj) => ({
        ...proj,
        phrases: proj.phrases.map((p) =>
          p.id === phrase.id ? (typeof patch === 'function' ? patch(p) : { ...p, ...patch }) : p,
        ),
      }),
      merge,
    );

  const setAnim = (patch: Partial<Animation>, merge = true) =>
    setPhrase((p) => ({ ...p, animation: { ...p.animation, ...patch } }), merge);

  const setRoleStyle = (r: Role, patch: Partial<TextStyle>) =>
    setPhrase((p) => ({
      ...p,
      roleStyles: { ...p.roleStyles, [r]: { ...p.roleStyles?.[r], ...patch } },
    }));

  const setWord = (id: string, patch: Partial<Word>, merge = true) =>
    setPhrase(
      (p) => ({
        ...p,
        words: p.words.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      }),
      merge,
    );

  const commitPhraseText = (nextText: string) => {
    const cleaned = nextText.trim();
    if (cleaned && cleaned !== phraseText(phrase)) {
      setPhrase((ph) => retextPhrase(ph, cleaned), false);
    }
  };

  const handleSaveCustomPreset = () => {
    const name = (customPresetName.trim() || `${preset.name} (meu)`).slice(0, 60);
    const roles = (['small', 'normal', 'key'] as Role[]).reduce(
      (acc, r) => ({ ...acc, [r]: resolveWordStyle(preset, r, phrase.roleStyles) }),
      {} as Record<Role, TextStyle>,
    );
    const np: Preset = {
      ...preset,
      id: newId('preset'),
      name,
      description: 'Modelo personalizado',
      roles,
      animation: anim,
      align: phrase.align ?? preset.align,
      position: { x: phrase.x, y: phrase.y },
    };
    apply(
      (proj) => ({
        ...proj,
        customPresets: [...proj.customPresets, np],
        phrases: proj.phrases.map((p) =>
          p.id === phrase.id
            ? { ...p, presetId: np.id, roleStyles: undefined, animation: undefined }
            : p,
        ),
      }),
      false,
    );
    setSavingPresetOpen(false);
    setCustomPresetName('');
  };

  return (
    <MobileBottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) commitPhraseText(textDraft);
        onOpenChange(next);
      }}
      title="Editar Legenda"
      onConfirm={() => {
        commitPhraseText(textDraft);
        onOpenChange(false);
      }}
      maxHeight="70dvh"
    >
      <div className="flex flex-col gap-3">
        {/* 1. Barra de Edição de Texto no Topo (Padrão CapCut Print 5) */}
        <div className="flex items-start gap-2 rounded-xl bg-[#0B0C10] border border-white/15 p-2">
          {expandedText ? (
            <textarea
              rows={3}
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onBlur={() => commitPhraseText(textDraft)}
              aria-label="Texto da legenda"
              className="flex-1 bg-transparent text-white text-[16px] leading-snug focus:outline-none resize-none"
              placeholder="Digite a legenda…"
            />
          ) : (
            <input
              type="text"
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onBlur={() => commitPhraseText(textDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitPhraseText(textDraft);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-label="Texto da legenda"
              className="flex-1 bg-transparent text-white text-[16px] h-9 focus:outline-none"
              placeholder="Digite a legenda…"
            />
          )}
          <button
            type="button"
            onClick={() => setExpandedText((v) => !v)}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-white/[0.06] text-[#9CA3AF] hover:text-white flex items-center justify-center shrink-0"
            aria-label={expandedText ? 'Recolher campo de texto' : 'Expandir campo de texto'}
          >
            {expandedText ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

        {/* 2. Abas Horizontais Estilo CapCut (Modelos | Fontes | Estilos | Efeitos | Animações | Palavra) */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-white/[0.07] no-scrollbar"
          role="tablist"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (t.id === 'palavra' && !word) {
                    onSelectWord(phrase.words[0]?.id ?? null);
                  }
                  setTab(t.id);
                }}
                className={`px-3 py-1.5 min-h-[36px] min-w-0 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-white/12 text-white border-b-2 border-[#00D4EB]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 3. Conteúdo da Aba Selecionada */}
        {tab === 'modelos' && (
          <div className="flex flex-col gap-3">
            {/* Checkbox "Aplicar a todas as legendas principais" (Print 5 CapCut) */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[12px] text-[#9CA3AF] cursor-pointer select-none">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                    applyAllCaptions
                      ? 'bg-[#00D4EB] border-[#00D4EB] text-[#041B1E]'
                      : 'border-white/30 bg-transparent'
                  }`}
                >
                  {applyAllCaptions && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={applyAllCaptions}
                  onChange={(e) => setApplyAllCaptions(e.target.checked)}
                />
                <span>Aplicar a todas as legendas principais</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setCustomPresetName(`${preset.name} (meu)`);
                  setSavingPresetOpen((v) => !v);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] min-w-0 rounded-lg bg-white/[0.07] text-[11px] font-semibold text-[#00D4EB]"
              >
                <Plus size={12} aria-hidden="true" />
                <span>Salvar como modelo</span>
              </button>
            </div>

            {/* Gaveta inline para Salvar como Modelo (substitui window.prompt no mobile) */}
            {savingPresetOpen && (
              <div className="rounded-xl bg-[#0B0C10] border border-[#00D4EB]/40 p-2.5 flex items-center gap-2">
                <input
                  type="text"
                  value={customPresetName}
                  onChange={(e) => setCustomPresetName(e.target.value)}
                  placeholder="Nome do modelo personalizado"
                  aria-label="Nome do modelo personalizado"
                  className="flex-1 bg-[#15171E] border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomPreset}
                  className="mob-btn-cyan px-3 py-1.5 min-h-[36px] min-w-0 rounded-lg text-xs font-bold"
                >
                  Guardar
                </button>
              </div>
            )}

            {/* Grade de 3 colunas de Modelos */}
            <div className="grid grid-cols-3 gap-2">
              {[...PRESETS, ...project.customPresets].map((pr) => {
                const key = pr.roles.key;
                const small = pr.roles.small;
                const fill =
                  key.fill.type === 'solid'
                    ? key.fill.color
                    : key.fill.colors[1] ?? key.fill.colors[0];
                const isCurrent = phrase.presetId === pr.id;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() =>
                      apply(
                        (proj) => ({
                          ...proj,
                          phrases: proj.phrases.map((p) =>
                            applyAllCaptions || p.id === phrase.id
                              ? applyPresetToPhrase(p, pr.id, proj)
                              : p,
                          ),
                        }),
                        false,
                      )
                    }
                    className={`rounded-xl bg-[#1E212B] p-2 flex flex-col items-center justify-center min-h-[74px] transition-all ${
                      isCurrent
                        ? 'ring-2 ring-[#00D4EB] bg-[#1E212B]'
                        : 'border border-white/10'
                    }`}
                  >
                    <span
                      style={{
                        fontFamily: fontCss(small.fontFamily),
                        fontWeight: small.fontWeight,
                        color: '#cbd5e1',
                        fontSize: 9,
                      }}
                    >
                      {small.uppercase ? 'VOCÊ NÃO' : 'você não'}
                    </span>
                    <span
                      style={{
                        fontFamily: fontCss(key.fontFamily),
                        fontWeight: Math.min(key.fontWeight, 900),
                        fontStyle: key.italic ? 'italic' : 'normal',
                        color: fill,
                        fontSize: 16,
                        lineHeight: 1.1,
                        textShadow: key.glow ? `0 0 8px ${key.glow.color}` : undefined,
                      }}
                    >
                      {key.uppercase ? 'VENDE' : 'vende'}
                    </span>
                    <span className="mt-1 text-[10px] text-[#9CA3AF] truncate max-w-full">
                      {pr.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'fontes' && (
          <div className="flex flex-col gap-3">
            <div className="flex rounded-lg bg-[#0B0C10] p-1 border border-white/10">
              {(['key', 'normal', 'small'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1 min-h-[34px] min-w-0 rounded-md text-xs font-semibold ${
                    role === r ? 'bg-[#00D4EB] text-[#041B1E]' : 'text-[#9CA3AF]'
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-[210px] overflow-y-auto pr-1">
              {FONTS.map((f) => {
                const isSelected = activeStyle.fontFamily === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      const [lo, hi] = fontDef(f.key).weights;
                      setRoleStyle(role, {
                        fontFamily: f.key as FontKey,
                        fontWeight: Math.min(hi, Math.max(lo, activeStyle.fontWeight)),
                      });
                    }}
                    className={`rounded-xl bg-[#1E212B] px-2 py-2.5 flex flex-col items-center justify-center text-center min-h-[58px] ${
                      isSelected
                        ? 'ring-2 ring-[#00D4EB] text-white'
                        : 'border border-white/10 text-white/90'
                    }`}
                  >
                    <span
                      style={{
                        fontFamily: fontCss(f.key),
                        fontSize: 15,
                        lineHeight: 1.15,
                      }}
                      className="truncate max-w-full"
                    >
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <Slider
              label="Tamanho"
              value={activeStyle.fontSize}
              min={16}
              max={500}
              onChange={(v) => setRoleStyle(role, { fontSize: v })}
            />
          </div>
        )}

        {tab === 'estilos' && (
          <div className="flex flex-col gap-3">
            <div className="flex rounded-lg bg-[#0B0C10] p-1 border border-white/10">
              {(['key', 'normal', 'small'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1 min-h-[34px] min-w-0 rounded-md text-xs font-semibold ${
                    role === r ? 'bg-[#00D4EB] text-[#041B1E]' : 'text-[#9CA3AF]'
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#9CA3AF]">Alinhamento</span>
              <div className="flex rounded-lg bg-[#0B0C10] p-0.5 border border-white/10">
                {(['left', 'center', 'right'] as const).map((a) => {
                  const isOn = (phrase.align ?? preset.align) === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setPhrase({ align: a }, false)}
                      className={`px-3 py-1 min-h-[32px] min-w-0 rounded-md text-xs font-semibold ${
                        isOn ? 'bg-[#00D4EB] text-[#041B1E]' : 'text-[#9CA3AF]'
                      }`}
                    >
                      {a === 'left' ? 'Esq.' : a === 'center' ? 'Centro' : 'Dir.'}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-white/90 py-1">
              <input
                type="checkbox"
                checked={!!phrase.behind}
                disabled={!hasMask}
                onChange={(e) => setPhrase({ behind: e.target.checked }, false)}
              />
              <span>Legenda atrás da pessoa {!hasMask && '(analise na ferramenta Pessoa)'}</span>
            </label>

            <StyleEditor
              style={activeStyle}
              sample={phrase.words.find((w) => w.role === role)?.text}
              onChange={(patch) => setRoleStyle(role, patch)}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
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
                            highlightScale: phrase.highlightScale,
                            align: phrase.align,
                          },
                    ),
                  }))
                }
                className="px-3 py-1.5 min-h-[38px] rounded-lg bg-[#1E212B] border border-white/10 text-xs font-semibold"
              >
                Aplicar estilo em todas
              </button>
              <button
                type="button"
                onClick={() =>
                  setPhrase(
                    {
                      roleStyles: undefined,
                      animation: undefined,
                      highlight: undefined,
                      scale: 1,
                      rotation: 0,
                      rotateX: 0,
                      rotateY: 0,
                      align: undefined,
                      x: preset.position.x,
                      y: preset.position.y,
                    },
                    false,
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-lg bg-[#1E212B] border border-white/10 text-xs text-[#9CA3AF]"
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>Restaurar padrão</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'efeitos' && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-white py-1">
              <input
                type="checkbox"
                checked={!!hl}
                onChange={(e) =>
                  setPhrase(
                    {
                      highlight: e.target.checked
                        ? { fill: { type: 'solid', color: '#FFE14D' } }
                        : null,
                    },
                    false,
                  )
                }
              />
              <span>Karaokê: destacar a palavra falada agora</span>
            </label>

            {hl && (
              <>
                <Slider
                  label="Pop (escala)"
                  value={phrase.highlightScale ?? 1}
                  min={1}
                  max={1.6}
                  step={0.05}
                  onChange={(v) => setPhrase({ highlightScale: v })}
                />
                <StyleEditor
                  style={{ ...hlBase, ...hl }}
                  sample={phrase.words[0]?.text}
                  onChange={(patch) =>
                    setPhrase((p) => ({ ...p, highlight: { ...p.highlight, ...patch } }))
                  }
                />
              </>
            )}

            {phraseEmojis.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#9CA3AF]">Emojis sugeridos:</span>
                {phraseEmojis.map((em) => {
                  const target =
                    phrase.words.find((w) => w.role === 'key') ??
                    phrase.words[phrase.words.length - 1];
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() =>
                        target && setWord(target.id, { text: withEmoji(target.text, em) }, false)
                      }
                      className="px-2.5 py-1 min-h-[36px] min-w-[36px] rounded-lg bg-[#1E212B] border border-white/10 text-base"
                    >
                      {em}
                    </button>
                  );
                })}
              </div>
            )}

            <h4 className="text-xs font-semibold text-[#9CA3AF] pt-1">Transformar & 3D</h4>
            <Slider
              label="Escala"
              value={phrase.scale}
              min={0.2}
              max={3}
              step={0.05}
              onChange={(v) => setPhrase({ scale: v })}
            />
            <Slider
              label="Rotação"
              value={phrase.rotation}
              min={-180}
              max={180}
              onChange={(v) => setPhrase({ rotation: v })}
            />
            <Slider
              label="Inclinar 3D X"
              value={phrase.rotateX}
              min={-70}
              max={70}
              onChange={(v) => setPhrase({ rotateX: v })}
            />
            <Slider
              label="Girar 3D Y"
              value={phrase.rotateY}
              min={-70}
              max={70}
              onChange={(v) => setPhrase({ rotateY: v })}
            />
          </div>
        )}

        {tab === 'animacoes' && (
          <div className="flex flex-col gap-3">
            <label className="field">
              <span>Revelar</span>
              <select
                value={anim.mode}
                onChange={(e) => setAnim({ mode: e.target.value as Animation['mode'] }, false)}
              >
                {Object.entries(MODE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Entrada</span>
              <select
                value={anim.entrance}
                onChange={(e) =>
                  setAnim({ entrance: e.target.value as Animation['entrance'] }, false)
                }
              >
                {ENTRANCES.map((k) => (
                  <option key={k} value={k}>
                    {ENTRANCE_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Saída</span>
              <select
                value={anim.exit}
                onChange={(e) => setAnim({ exit: e.target.value as Animation['exit'] }, false)}
              >
                {EXITS.map((k) => (
                  <option key={k} value={k}>
                    {EXIT_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label="Duração (ms)"
              value={anim.durationMs}
              min={0}
              max={1500}
              step={10}
              onChange={(v) => setAnim({ durationMs: v })}
            />
            <Slider
              label="Intervalo (ms)"
              value={anim.staggerMs}
              min={0}
              max={500}
              step={10}
              onChange={(v) => setAnim({ staggerMs: v })}
            />
            <Slider
              label="Segurar (ms)"
              value={anim.holdMs}
              min={0}
              max={1500}
              step={50}
              onChange={(v) => setAnim({ holdMs: v })}
            />
          </div>
        )}

        {tab === 'palavra' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Palavras da frase">
              {phrase.words.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="option"
                  aria-selected={w.id === wordId}
                  onClick={() => onSelectWord(w.id)}
                  className={`px-2.5 py-1 min-h-[36px] min-w-0 rounded-lg text-xs font-semibold ${
                    w.id === wordId
                      ? 'bg-[#00D4EB] text-[#041B1E]'
                      : w.role === 'key'
                        ? 'bg-[#4338CA] text-white'
                        : 'bg-[#1E212B] text-white/90 border border-white/10'
                  }`}
                >
                  {w.text}
                </button>
              ))}
            </div>

            {word && (
              <div className="flex flex-col gap-2.5">
                <label className="field">
                  <span>Palavra</span>
                  <input
                    className="text field-wide"
                    value={word.text}
                    onChange={(e) => setWord(word.id, { text: e.target.value.slice(0, 200) })}
                  />
                </label>

                {wordEmojis.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#9CA3AF]">Emoji:</span>
                    {wordEmojis.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() =>
                          setWord(word.id, { text: withEmoji(word.text, em) }, false)
                        }
                        className="px-2 py-1 min-h-[34px] min-w-[34px] rounded bg-[#1E212B] border border-white/10"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex rounded-lg bg-[#0B0C10] p-0.5 border border-white/10 flex-1">
                    {(['small', 'normal', 'key'] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setWord(word.id, { role: r }, false)}
                        className={`flex-1 py-1 min-h-[32px] min-w-0 rounded-md text-xs font-semibold ${
                          word.role === r ? 'bg-[#00D4EB] text-[#041B1E]' : 'text-[#9CA3AF]'
                        }`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={phrase.words.findIndex((w) => w.id === word.id) <= 0}
                    onClick={() => {
                      const at = phrase.words.findIndex((w) => w.id === word.id);
                      apply(
                        (proj) => ({
                          ...proj,
                          phrases: splitPhrase(proj.phrases, phrase.id, at),
                        }),
                        false,
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] min-w-0 rounded-lg bg-[#1E212B] border border-white/10 text-xs disabled:opacity-40"
                  >
                    <Scissors size={13} aria-hidden="true" />
                    <span>Dividir aqui</span>
                  </button>
                </div>

                <Slider
                  label="Início (ms)"
                  value={word.startMs}
                  min={0}
                  max={project.video.durationMs}
                  step={10}
                  onChange={(v) => setPhrase((p) => setWordTime(p, word.id, v, word.endMs))}
                />
                <Slider
                  label="Fim (ms)"
                  value={word.endMs}
                  min={0}
                  max={project.video.durationMs}
                  step={10}
                  onChange={(v) => setPhrase((p) => setWordTime(p, word.id, word.startMs, v))}
                />
                <Slider
                  label="Deslocar X"
                  value={word.dx ?? 0}
                  min={-800}
                  max={800}
                  onChange={(v) => setWord(word.id, { dx: v })}
                />
                <Slider
                  label="Deslocar Y"
                  value={word.dy ?? 0}
                  min={-800}
                  max={800}
                  onChange={(v) => setWord(word.id, { dy: v })}
                />
                <Slider
                  label="Rotação"
                  value={word.rotation ?? 0}
                  min={-180}
                  max={180}
                  onChange={(v) => setWord(word.id, { rotation: v })}
                />
                <Slider
                  label="Escala"
                  value={word.scaleX ?? 1}
                  min={0.1}
                  max={5}
                  step={0.05}
                  onChange={(v) => setWord(word.id, { scaleX: v, scaleY: v })}
                />
                <button
                  type="button"
                  onClick={() =>
                    setWord(
                      word.id,
                      {
                        style: undefined,
                        dx: 0,
                        dy: 0,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                      },
                      false,
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 py-2 min-h-[38px] rounded-lg bg-[#1E212B] border border-white/10 text-xs text-[#9CA3AF]"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  <span>Limpar ajustes da palavra</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};
