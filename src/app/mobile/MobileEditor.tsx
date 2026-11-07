import { ChevronLeft, Download } from 'lucide-react';
import React from 'react';
import { Preview } from '../components/Preview';
import { MobileTimeline } from './MobileTimeline';
import type { EditorState } from './useEditor';

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
    activeMasks,
    seekMs,
    onMovePhrase,
    onTransformPhrase,
    onMoveWord,
    addAtPlayhead,
    duplicate,
    remove,
    closeProject,
  } = ed;

  if (!project) return null;

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
        onAddAtPlayhead={addAtPlayhead}
        mediaUrl={playable?.video.src ?? null}
      />
    </div>
  );
};
