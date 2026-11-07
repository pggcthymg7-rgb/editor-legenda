import { Check, Cloud, Cpu, KeyRound, Loader2, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { sortPhrases } from '../../core/edit';
import { fontCss } from '../../core/fonts';
import { buildPhrase, groupWords } from '../../core/grouping';
import { PRESETS } from '../../core/presets';
import type { Phrase, Project } from '../../core/types';
import {
  cloudHealth,
  cloudTranscribe,
  getGroqKey,
  isGroqKey,
  setGroqKey,
  type CloudState,
} from '../cloud';
import { platform } from '../platform';
import { extractAudio } from '../platform/audio';
import {
  isSafariLike,
  transcribeLocal,
  type Lang,
  type LocalModel,
} from '../transcribe';
import { MobileBottomSheet } from './MobileBottomSheet';

export function applyGeneratedPhrases(
  project: Project,
  newPhrases: Phrase[],
  clearExisting: boolean,
): Project {
  return {
    ...project,
    phrases: clearExisting ? newPhrases : sortPhrases([...project.phrases, ...newPhrases]),
  };
}

export type MobileAutoCaptionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  onSelectPhrase: (phraseId: string | null) => void;
};

type EngineMode = 'cloud' | 'local';

const LANG_LABELS: Record<Lang, string> = {
  pt: 'Português',
  en: 'Inglês',
  es: 'Espanhol',
  auto: 'Detectar idioma',
};

export const MobileAutoCaptionsSheet: React.FC<MobileAutoCaptionsSheetProps> = ({
  open,
  onOpenChange,
  project,
  apply,
  onSelectPhrase,
}) => {
  const [lang, setLang] = useState<Lang>('pt');
  const [engine, setEngine] = useState<EngineMode>('cloud');
  const [localModel, setLocalModel] = useState<LocalModel>(() =>
    isSafariLike() ? 'base' : 'small',
  );
  const [presetId, setPresetId] = useState<string>(
    () => project.phrases[0]?.presetId ?? PRESETS[0].id,
  );
  // Marcado por padrão conforme referência CapCut ("Apagar legendas atuais")
  const [clearExisting, setClearExisting] = useState<boolean>(true);

  const [cloudState, setCloudState] = useState<CloudState>('checking');
  const [groqInput, setGroqInput] = useState<string>(() => getGroqKey() ?? '');
  const [showKeyBox, setShowKeyBox] = useState<boolean>(false);

  const [busy, setBusy] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string>('');

  const supportsVideoFile = typeof platform.videoFile === 'function';

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCloudState('checking');
    cloudHealth().then((st) => {
      if (alive) setCloudState(st);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const allPresets = [...PRESETS, ...project.customPresets];

  const handleSaveGroqKey = () => {
    const trimmed = groqInput.trim();
    if (!trimmed) {
      setGroqKey(null);
      setShowKeyBox(false);
      cloudHealth().then(setCloudState);
      return;
    }
    if (!isGroqKey(trimmed)) {
      setError('A chave do Groq deve começar com gsk_ e ter pelo menos 24 caracteres.');
      return;
    }
    setGroqKey(trimmed);
    setError('');
    setShowKeyBox(false);
    setCloudState('ready');
  };

  const handleGenerate = async () => {
    if (!supportsVideoFile || !platform.videoFile) {
      setError('Disponível só no iPhone por enquanto');
      return;
    }
    setBusy(true);
    setError('');
    setProgress(0);
    setStatusMsg('Lendo o vídeo do aparelho…');

    try {
      const videoBlob = await platform.videoFile(project.video.src);
      if (!videoBlob) {
        throw new Error('Arquivo do vídeo não encontrado neste aparelho. Reabra o vídeo.');
      }

      let words;
      if (engine === 'cloud') {
        setStatusMsg('Extraindo áudio leve (AAC)…');
        const audioBlob = await extractAudio(videoBlob, (p: number) => {
          setProgress(p * 0.5);
        });
        setStatusMsg('Transcrevendo na nuvem (Groq Whisper)…');
        setProgress(0.65);
        words = await cloudTranscribe(
          audioBlob,
          lang,
          fetch,
          project.video.durationMs / 1000,
        );
      } else {
        words = await transcribeLocal(
          videoBlob,
          localModel,
          (msg, p) => {
            setStatusMsg(msg);
            if (typeof p === 'number') setProgress(p);
          },
          lang,
        );
      }

      const groups = groupWords(words, { gapMs: 400, maxWords: 4 });
      const generated = groups.map((g) => buildPhrase(g, presetId, project.customPresets));
      if (!generated.length) {
        throw new Error('Nenhuma fala encontrada no vídeo.');
      }

      // Passa por apply(..., false) para entrar na pilha de undo/redo sem diálogo extra
      apply((proj) => applyGeneratedPhrases(proj, generated, clearExisting), false);
      onSelectPhrase(generated[0]?.id ?? null);
      setStatusMsg('');
      setProgress(undefined);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message || 'Falha ao gerar legendas automáticas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Gere legendas automáticas"
      maxHeight="76dvh"
    >
      {!supportsVideoFile ? (
        <div className="py-6 px-3 text-center">
          <p className="text-sm text-[#9CA3AF]">Disponível só no iPhone por enquanto</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Carrossel horizontal de Modelos (Presets) estilo CapCut */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-[#9CA3AF]">
                Animação de legendas (Modelo)
              </span>
              <span className="text-[11px] text-[#00D4EB] font-medium">
                {allPresets.find((p) => p.id === presetId)?.name}
              </span>
            </div>
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {allPresets.map((pr) => {
                const key = pr.roles.key;
                const small = pr.roles.small;
                const fill =
                  key.fill.type === 'solid'
                    ? key.fill.color
                    : key.fill.colors[1] ?? key.fill.colors[0];
                const isSel = pr.id === presetId;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setPresetId(pr.id)}
                    className={`relative shrink-0 w-24 h-16 rounded-xl bg-[#1E212B] flex flex-col items-center justify-center px-1.5 transition-all ${
                      isSel
                        ? 'ring-2 ring-[#00D4EB] bg-[#1E212B]'
                        : 'border border-white/10 opacity-85'
                    }`}
                  >
                    <span
                      style={{
                        fontFamily: fontCss(small.fontFamily),
                        fontWeight: small.fontWeight,
                        color: '#cbd5e1',
                        fontSize: 9,
                        lineHeight: 1.1,
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
                        fontSize: 15,
                        lineHeight: 1.1,
                        textShadow: key.glow ? `0 0 8px ${key.glow.color}` : undefined,
                      }}
                    >
                      {key.uppercase ? 'VENDE' : 'vende'}
                    </span>
                    <span className="mt-1 text-[9px] text-[#9CA3AF] truncate max-w-full">
                      {pr.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linhas de configuração estilo CapCut */}
          <div className="rounded-xl bg-[#1E212B] border border-white/[0.08] divide-y divide-white/[0.06]">
            <div className="flex items-center justify-between px-3.5 py-2.5 min-h-[46px]">
              <span className="text-[13px] text-white/90">Gerar a partir de</span>
              <span className="text-[13px] font-semibold text-[#9CA3AF]">Vídeo</span>
            </div>

            <label className="flex items-center justify-between px-3.5 py-2 min-h-[46px]">
              <span className="text-[13px] text-white/90">Idioma de origem</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                disabled={busy}
                aria-label="Idioma de origem"
                className="bg-transparent text-right text-[13px] font-semibold text-[#00D4EB] focus:outline-none"
              >
                {(Object.keys(LANG_LABELS) as Lang[]).map((k) => (
                  <option key={k} value={k} className="bg-[#15171E] text-white">
                    {LANG_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>

            <div className="px-3.5 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-white/90">Motor de transcrição</span>
                <div className="flex rounded-lg bg-[#0B0C10] p-0.5 border border-white/10">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEngine('cloud')}
                    className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] min-w-0 rounded-md text-[11px] font-semibold transition-colors ${
                      engine === 'cloud'
                        ? 'bg-[#00D4EB] text-[#041B1E]'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    <Cloud size={12} aria-hidden="true" />
                    <span>Nuvem (Groq)</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEngine('local')}
                    className={`flex items-center gap-1 px-2.5 py-1 min-h-[32px] min-w-0 rounded-md text-[11px] font-semibold transition-colors ${
                      engine === 'local'
                        ? 'bg-[#00D4EB] text-[#041B1E]'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    <Cpu size={12} aria-hidden="true" />
                    <span>No aparelho</span>
                  </button>
                </div>
              </div>

              {engine === 'cloud' ? (
                <div className="text-[11px] text-[#9CA3AF] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span>
                      {cloudState === 'checking' && 'Verificando servidor…'}
                      {cloudState === 'ready' && 'Nuvem pronta (rápido · ~5s)'}
                      {cloudState === 'nokey' && 'Informe sua chave grátis do Groq (gsk_...)'}
                      {cloudState === 'offline' && 'Servidor indisponível; use "No aparelho".'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowKeyBox((v) => !v)}
                      className="inline-flex items-center gap-1 text-[#00D4EB] font-medium min-h-[32px] min-w-0 px-1.5"
                    >
                      <KeyRound size={12} aria-hidden="true" />
                      <span>{getGroqKey() ? 'Trocar chave' : 'Chave Groq'}</span>
                    </button>
                  </div>
                  {(showKeyBox || cloudState === 'nokey') && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="password"
                        value={groqInput}
                        onChange={(e) => setGroqInput(e.target.value)}
                        placeholder="Cole sua chave gsk_..."
                        aria-label="Chave da API Groq"
                        className="flex-1 bg-[#0B0C10] border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleSaveGroqKey}
                        className="px-3 py-1.5 min-h-[36px] min-w-0 rounded-lg bg-[#00D4EB] text-[#041B1E] font-bold text-xs"
                      >
                        Salvar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#9CA3AF]">
                    100% offline no aparelho ({isSafariLike() ? 'CPU/WASM no iPhone' : 'WebGPU/CPU'})
                  </span>
                  <select
                    value={localModel}
                    onChange={(e) => setLocalModel(e.target.value as LocalModel)}
                    disabled={busy}
                    aria-label="Modelo Whisper local"
                    className="bg-[#0B0C10] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white"
                  >
                    <option value="base">Leve (base)</option>
                    <option value="small">Equilibrado (small)</option>
                    <option value="medium">Preciso (medium)</option>
                    <option value="large-v3-turbo">Máximo (turbo)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Status de progresso ou erro */}
          {busy && (
            <div className="rounded-xl bg-[#1E212B] p-3 border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-white">
                <Loader2 size={15} className="animate-spin text-[#00D4EB]" aria-hidden="true" />
                <span>{statusMsg || 'Processando…'}</span>
              </div>
              {typeof progress === 'number' && (
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#00D4EB] transition-all"
                    style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          {/* CTA Primário Ciano CapCut "Gerar" */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGenerate}
            className="mob-btn-cyan w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span>Gerando legendas…</span>
              </>
            ) : (
              <>
                <Sparkles size={17} aria-hidden="true" />
                <span>Gerar</span>
              </>
            )}
          </button>

          {/* Checkbox "Apagar legendas atuais" marcado por padrão */}
          <label className="flex items-center justify-center gap-2 py-1 text-[12px] text-[#9CA3AF] cursor-pointer select-none">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                clearExisting
                  ? 'bg-[#00D4EB] border-[#00D4EB] text-[#041B1E]'
                  : 'border-white/30 bg-transparent'
              }`}
            >
              {clearExisting && <Check size={11} strokeWidth={3} aria-hidden="true" />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
            />
            <span>Apagar legendas atuais</span>
          </label>
        </div>
      )}
    </MobileBottomSheet>
  );
};
