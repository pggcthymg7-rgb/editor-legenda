import {
  CaseSensitive,
  ChevronLeft,
  Download,
  WholeWord,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { countMatches, replaceAll } from '../../core/edit';
import { shiftPhrase, splitPhrase } from '../../core/grouping';
import type { Role } from '../../core/types';
import { Camera3DPanel } from '../components/Camera3DPanel';
import { ExportPanel } from '../components/ExportPanel';
import { PersonPanel } from '../components/PersonPanel';
import { PhraseList } from '../components/PhraseList';
import { Preview } from '../components/Preview';
import { MobileAutoCaptionsSheet } from './MobileAutoCaptionsSheet';
import { MobileBottomSheet } from './MobileBottomSheet';
import { MobileInspectorSheet, type InspectorTab } from './MobileInspectorSheet';
import { MobileTimeline } from './MobileTimeline';
import { MobileToolbar, type MobileActiveSheet } from './MobileToolbar';
import type { EditorState } from './useEditor';

const NEXT_ROLE: Record<Role, Role> = {
  normal: 'key',
  key: 'small',
  small: 'normal',
};

export const MobileEditor: React.FC<{ ed: EditorState }> = ({ ed }) => {
  const {
    project,
    apply,
    undo,
    redo,
    canUndo,
    canRedo,
    selection,
    setSelection,
    currentMs,
    setCurrentMs,
    playing,
    setPlaying,
    saveState,
    playerRef,
    playable,
    videoError,
    maskUrls,
    activeMasks,
    selected,
    seekMs,
    onMovePhrase,
    onTransformPhrase,
    onMoveWord,
    addAtPlayhead,
    splitAtPlayhead,
    duplicate,
    remove,
    closeProject,
  } = ed;

  const [activeSheet, setActiveSheet] = useState<MobileActiveSheet>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('modelos');

  // Estado do sheet "Buscar e Substituir"
  const [find, setFind] = useState('');
  const [repl, setRepl] = useState('');
  const [cs, setCs] = useState(false);
  const [ww, setWw] = useState(true);
  const [findMsg, setFindMsg] = useState('');

  const matches = useMemo(
    () => (project ? countMatches(project, find, { caseSensitive: cs, wholeWord: ww }) : 0),
    [project, find, cs, ww],
  );

  if (!project) return null;

  const selectedWord =
    selected && selection.wordId
      ? selected.words.find((w) => w.id === selection.wordId) ?? null
      : null;

  const openSheet = (sheet: MobileActiveSheet, tab?: InspectorTab) => {
    if (tab) setInspectorTab(tab);
    setActiveSheet((cur) => (cur === sheet && (!tab || inspectorTab === tab) ? null : sheet));
  };

  const handleToggleBehindPerson = () => {
    if (!selected) return;
    if (!project.video.mask) {
      setActiveSheet('pessoa');
      return;
    }
    apply(
      (proj) => ({
        ...proj,
        phrases: proj.phrases.map((p) =>
          p.id === selected.id ? { ...p, behind: !p.behind } : p,
        ),
      }),
      false,
    );
  };

  const handleSplitAtWord = () => {
    if (!selected || !selectedWord) return;
    const at = selected.words.findIndex((w) => w.id === selectedWord.id);
    if (at <= 0) return;
    apply((proj) => ({ ...proj, phrases: splitPhrase(proj.phrases, selected.id, at) }), false);
  };

  const handleCycleWordRole = () => {
    if (!selected || !selectedWord) return;
    const nextRole = NEXT_ROLE[selectedWord.role];
    apply(
      (proj) => ({
        ...proj,
        phrases: proj.phrases.map((p) =>
          p.id === selected.id
            ? {
                ...p,
                words: p.words.map((w) =>
                  w.id === selectedWord.id ? { ...w, role: nextRole } : w,
                ),
              }
            : p,
        ),
      }),
      false,
    );
  };

  const handleResetWord = () => {
    if (!selected || !selectedWord) return;
    apply(
      (proj) => ({
        ...proj,
        phrases: proj.phrases.map((p) =>
          p.id === selected.id
            ? {
                ...p,
                words: p.words.map((w) =>
                  w.id === selectedWord.id
                    ? {
                        ...w,
                        style: undefined,
                        dx: 0,
                        dy: 0,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                      }
                    : w,
                ),
              }
            : p,
        ),
      }),
      false,
    );
  };

  return (
    <div
      className="mobile-root flex flex-col w-full overflow-hidden bg-[#0B0C10] text-[#F8FAFC]"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Topbar CapCut Mobile */}
      <header className="flex items-center justify-between h-12 px-2.5 bg-[#0B0C10] border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={closeProject}
            className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10"
            title="Voltar para o início"
            aria-label="Voltar para o início"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <input
            className="bg-transparent border-none text-[13px] font-semibold text-white truncate max-w-[140px] focus:outline-none focus:ring-1 focus:ring-[#00D4EB] rounded px-1.5 py-1"
            aria-label="Nome do projeto"
            value={project.name}
            onChange={(e) => apply((p) => ({ ...p, name: e.target.value.slice(0, 120) }), true)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[#9CA3AF]"
            role="status"
          >
            {saveState === 'ok' ? 'Salvo' : saveState === 'saving' ? 'Salvando…' : 'Erro'}
          </span>
          <button
            type="button"
            onClick={() => openSheet('export')}
            className="mob-btn-cyan flex items-center gap-1.5 h-9 min-h-[36px] px-3.5 rounded-full text-[13px] font-bold shadow-sm"
            aria-label="Exportar vídeo"
          >
            <Download size={14} aria-hidden="true" />
            <span>Exportar</span>
          </button>
        </div>
      </header>

      {/* Monitor Mobile com 4 alças de canto CapCut + barra de transporte compacta */}
      <section className="flex-1 min-h-0 flex flex-col bg-[#0B0C10] overflow-hidden" aria-label="Monitor">
        {playable ? (
          <Preview
            project={playable}
            playerRef={playerRef}
            selection={selection}
            onSelect={setSelection}
            onMovePhrase={onMovePhrase}
            onMoveWord={onMoveWord}
            onTransformPhrase={onTransformPhrase}
            onTime={setCurrentMs}
            onPlaying={setPlaying}
            currentMs={currentMs}
            playing={playing}
            maskUrls={activeMasks}
            mobileMode
            onDeletePhrase={remove}
            onEditPhraseText={() => {
              setInspectorTab('modelos');
              setActiveSheet('inspector');
            }}
            onDuplicatePhrase={duplicate}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-sm text-[#9CA3AF]">
            {videoError || 'Carregando vídeo…'}
          </div>
        )}
      </section>

      {/* Timeline Mobile CapCut (Agulha Central Fixa) */}
      <MobileTimeline
        project={project}
        apply={apply}
        currentMs={currentMs}
        playing={playing}
        seekMs={seekMs}
        selection={selection}
        onSelect={setSelection}
        onAddAtPlayhead={() => {
          addAtPlayhead();
          setInspectorTab('modelos');
          setActiveSheet('inspector');
        }}
        mediaUrl={playable?.video.src ?? null}
      />

      {/* Barra de Ferramentas Contextual Inferior (3 estados CapCut) */}
      <MobileToolbar
        selection={selection}
        selectedPhrase={selected}
        selectedWord={selectedWord}
        activeSheet={activeSheet}
        inspectorTab={inspectorTab}
        onOpenSheet={openSheet}
        onClearSelection={() => {
          setSelection({ phraseId: null, wordId: null });
          if (activeSheet === 'inspector') setActiveSheet(null);
        }}
        onBackToPhrase={() => setSelection({ phraseId: selection.phraseId, wordId: null })}
        onAddAtPlayhead={addAtPlayhead}
        onSplitAtPlayhead={splitAtPlayhead}
        onDuplicate={duplicate}
        onDelete={() => {
          remove();
          if (activeSheet === 'inspector') setActiveSheet(null);
        }}
        onToggleBehindPerson={handleToggleBehindPerson}
        onSplitAtWord={handleSplitAtWord}
        onCycleWordRole={handleCycleWordRole}
        onResetWord={handleResetWord}
      />

      {/* Sheet 1: Gere Legendas Automáticas (CapCut Print 1) */}
      <MobileAutoCaptionsSheet
        open={activeSheet === 'auto-captions'}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        project={project}
        apply={apply}
        onSelectPhrase={(phraseId) => setSelection({ phraseId, wordId: null })}
      />

      {/* Sheet 2: Inspetor CapCut (Texto + Modelos | Fontes | Estilos | Efeitos | Animações | Palavra) */}
      <MobileInspectorSheet
        open={activeSheet === 'inspector'}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        project={project}
        phrase={selected}
        wordId={selection.wordId}
        onSelectWord={(wordId) =>
          selected && setSelection({ phraseId: selected.id, wordId })
        }
        apply={apply}
        initialTab={inspectorTab}
      />

      {/* Sheet 3: Lista de Frases */}
      <MobileBottomSheet
        open={activeSheet === 'frases'}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        title={`Frases (${project.phrases.length})`}
        maxHeight="66dvh"
      >
        <PhraseList
          project={project}
          apply={apply}
          selectedId={selection.phraseId}
          onSelect={(id) => setSelection({ phraseId: id, wordId: null })}
          currentMs={currentMs}
          seekMs={seekMs}
        />
      </MobileBottomSheet>

      {/* Sheet 4: Buscar, Substituir e Sincronia em Massa */}
      <MobileBottomSheet
        open={activeSheet === 'buscar'}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        title="Buscar e Ajustes em Massa"
        maxHeight="66dvh"
      >
        <div className="findrep flex flex-col gap-3">
          <label className="stack-label text-xs text-[#9CA3AF]">
            Buscar
            <input
              className="text mt-1"
              value={find}
              onChange={(e) => {
                setFind(e.target.value);
                setFindMsg('');
              }}
            />
          </label>
          <label className="stack-label text-xs text-[#9CA3AF]">
            Trocar por
            <input
              className="text mt-1"
              value={repl}
              onChange={(e) => setRepl(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`icon ${cs ? 'on' : ''}`}
              aria-pressed={cs}
              onClick={() => setCs((v) => !v)}
              title="Diferenciar maiúsculas"
              aria-label="Diferenciar maiúsculas"
            >
              <CaseSensitive size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`icon ${ww ? 'on' : ''}`}
              aria-pressed={ww}
              onClick={() => setWw((v) => !v)}
              title="Palavra inteira"
              aria-label="Palavra inteira"
            >
              <WholeWord size={16} aria-hidden="true" />
            </button>
            <span className="text-xs text-[#9CA3AF]">
              {find ? `${matches} ocorrência(s)` : ''}
            </span>
          </div>
          <button
            type="button"
            className="mob-btn-cyan h-11 rounded-xl font-bold text-sm disabled:opacity-40"
            disabled={!find || !matches}
            onClick={() => {
              let n = 0;
              apply((proj) => {
                const r = replaceAll(proj, find, repl, {
                  caseSensitive: cs,
                  wholeWord: ww,
                });
                n = r.count;
                return r.project;
              });
              setFindMsg(`Substituído ${n || matches}×`);
            }}
          >
            Substituir tudo
          </button>
          {findMsg && (
            <p className="text-xs text-[#00D4EB]" role="status">
              {findMsg}
            </p>
          )}

          <h4 className="text-xs font-semibold text-[#9CA3AF] pt-2">
            Sincronia (todas as legendas)
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {[-500, -100, 100, 500].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() =>
                  apply((proj) => ({
                    ...proj,
                    phrases: proj.phrases.map((p) => shiftPhrase(p, d)),
                  }))
                }
                className="rounded-lg bg-[#1E212B] border border-white/10 py-2 text-xs font-semibold"
              >
                {d > 0 ? '+' : '−'}
                {Math.abs(d) / 1000}s
              </button>
            ))}
          </div>

          <h4 className="text-xs font-semibold text-[#9CA3AF] pt-2">Texto em massa</h4>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                apply((proj) => ({
                  ...proj,
                  phrases: proj.phrases.map((p) => ({
                    ...p,
                    words: p.words.map((w) => ({
                      ...w,
                      text: w.text.replace(/[.,;:!?…]+$/u, ''),
                    })),
                  })),
                }))
              }
              className="flex-1 rounded-lg bg-[#1E212B] border border-white/10 px-3 py-2 text-xs font-medium"
            >
              Tirar pontuação final
            </button>
            <button
              type="button"
              onClick={() =>
                apply((proj) => ({
                  ...proj,
                  phrases: proj.phrases.map((p) => ({
                    ...p,
                    roleStyles: {
                      ...p.roleStyles,
                      small: { ...p.roleStyles?.small, uppercase: true },
                      normal: { ...p.roleStyles?.normal, uppercase: true },
                      key: { ...p.roleStyles?.key, uppercase: true },
                    },
                  })),
                }))
              }
              className="flex-1 rounded-lg bg-[#1E212B] border border-white/10 px-3 py-2 text-xs font-medium"
            >
              TUDO EM CAIXA ALTA
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Painéis com progresso longo (Pessoa, Câmera 3D e Exportar) mantidos montados para nunca perder estado ao fechar a gaveta */}
      <div style={{ display: 'none' }} aria-hidden="true" />
      <MobileBottomSheet
        open={activeSheet === 'pessoa' || activeSheet === 'camera3d' || activeSheet === 'export'}
        onOpenChange={(o) => !o && setActiveSheet(null)}
        title={
          activeSheet === 'pessoa'
            ? 'Legenda atrás da pessoa'
            : activeSheet === 'camera3d'
              ? 'Câmera 3D (Rastrear cena)'
              : 'Exportar Vídeo / Legendas'
        }
        maxHeight="72dvh"
      >
        <div style={{ display: activeSheet === 'pessoa' ? 'block' : 'none' }}>
          <PersonPanel
            project={project}
            playableSrc={playable?.video.src ?? null}
            apply={apply}
            hasMasks={!!maskUrls}
          />
        </div>
        <div style={{ display: activeSheet === 'camera3d' ? 'block' : 'none' }}>
          <Camera3DPanel
            project={project}
            playableSrc={playable?.video.src ?? null}
            apply={apply}
            phraseId={selection.phraseId}
            currentMs={currentMs}
          />
        </div>
        <div style={{ display: activeSheet === 'export' ? 'block' : 'none' }}>
          {playable && (
            <ExportPanel
              project={playable}
              maskUrls={activeMasks}
              personMasks={maskUrls}
            />
          )}
        </div>
      </MobileBottomSheet>
    </div>
  );
};
