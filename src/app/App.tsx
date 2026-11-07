import {
  Clapperboard,
  Download,
  FilePlus2,
  Keyboard,
  Redo2,
  SlidersHorizontal,
  Undo2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { setWordTime } from '../core/edit';
import { shiftPhrase } from '../core/grouping';
import type { Project } from '../core/types';
import { FPS } from '../remotion/Root';
import { ExportPanel } from './components/ExportPanel';
import { Library, type LibTab } from './components/Library';
import { PersonPanel } from './components/PersonPanel';
import { Camera3DPanel } from './components/Camera3DPanel';
import { PhrasePanel } from './components/PhrasePanel';
import { Preview } from './components/Preview';
import { Timeline } from './components/Timeline';
import { UploadScreen } from './components/UploadScreen';
import { MobileEditor } from './mobile/MobileEditor';
import { MobileHome } from './mobile/MobileHome';
import { useEditor } from './mobile/useEditor';
import { useIsMobile } from './mobile/useIsMobile';

const SHORTCUTS: [string, string][] = [
  ['Espaço', 'Play / pause'],
  ['← / →', 'Quadro anterior / próximo (Shift = 1 s)'],
  ['Alt + ← / →', 'Deslocar frase/palavra (±50 ms)'],
  ['Home / End', 'Início / fim'],
  ['S', 'Dividir frase na agulha'],
  ['T', 'Nova frase na agulha'],
  ['⌘D', 'Duplicar frase'],
  ['Delete', 'Apagar frase'],
  ['Esc', 'Tirar seleção'],
  ['⌘Z / ⇧⌘Z', 'Desfazer / refazer'],
  ['⌘ + roda', 'Zoom da timeline'],
];

export const App: React.FC = () => {
  const ed = useEditor();
  const isMobile = useIsMobile();
  const {
    project,
    apply,
    load,
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
    active,
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

  const [exportOpen, setExportOpen] = useState(false);
  const [exportMounted, setExportMounted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [libTab, setLibTab] = useState<LibTab>('frases');

  // atalhos de teclado estilo NLE (apenas desktop)
  useEffect(() => {
    if (isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === 'Escape' && (exportOpen || helpOpen)) {
        setExportOpen(false);
        setHelpOpen(false);
        return;
      }
      if (el.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;
      const p = playerRef.current;
      const frame = Math.round((currentMs / 1000) * FPS);
      const k = e.key.toLowerCase();
      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && k === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && k === 'd') {
        e.preventDefault();
        duplicate();
      } else if (mod) {
        return;
      } else if (e.key === ' ') {
        e.preventDefault();
        p?.toggle();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.altKey && selection.phraseId) {
          const delta = (e.shiftKey ? 10 : 50) * (e.key === 'ArrowLeft' ? -1 : 1);
          apply(
            (proj) => ({
              ...proj,
              phrases: proj.phrases.map((ph) => {
                if (ph.id !== selection.phraseId) return ph;
                if (selection.wordId) {
                  const w = ph.words.find((x) => x.id === selection.wordId);
                  if (w) return setWordTime(ph, w.id, w.startMs + delta, w.endMs + delta);
                }
                return shiftPhrase(ph, delta);
              }),
            }),
            e.repeat,
          );
        } else {
          const d = (e.shiftKey ? FPS : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
          p?.seekTo(Math.max(0, frame + d));
        }
      } else if (e.key === 'Home') p?.seekTo(0);
      else if (e.key === 'End' && project) p?.seekTo(Math.ceil((project.video.durationMs / 1000) * FPS) - 1);
      else if (k === 's') splitAtPlayhead();
      else if (k === 't') addAtPlayhead();
      else if (e.key === 'Delete' || e.key === 'Backspace') remove();
      else if (e.key === 'Escape') setSelection({ phraseId: null, wordId: null });
      else if (e.key === '?') setHelpOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, undo, redo, duplicate, splitAtPlayhead, addAtPlayhead, remove, apply, selection, currentMs, project, exportOpen, helpOpen, playerRef, setSelection]);

  if (!project) {
    return isMobile ? (
      <MobileHome onReady={(p: Project) => load(p)} />
    ) : (
      <UploadScreen onReady={(p: Project) => load(p)} />
    );
  }

  if (isMobile) return <MobileEditor ed={ed} />;

  return (
    <div className="editor">
      <header className="topbar">
        <span className="brand" aria-hidden="true">
          <Clapperboard size={18} />
        </span>
        <button
          className="back-btn"
          onClick={async () => {
            setExportOpen(false);
            setExportMounted(false);
            await closeProject();
          }}
          title="Abrir outro vídeo"
          aria-label="Abrir outro vídeo"
        >
          <FilePlus2 size={16} aria-hidden="true" /> <span>Novo</span>
        </button>
        <input
          className="name"
          aria-label="Nome do projeto"
          value={project.name}
          onChange={(e) => apply((p) => ({ ...p, name: e.target.value.slice(0, 120) }), true)}
        />
        <div className="tb-group">
          <button className="icon" onClick={undo} disabled={!canUndo} title="Desfazer (⌘Z)" aria-label="Desfazer">
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button className="icon" onClick={redo} disabled={!canRedo} title="Refazer (⇧⌘Z)" aria-label="Refazer">
            <Redo2 size={18} aria-hidden="true" />
          </button>
        </div>
        <span className={`save ${saveState}`} role="status">
          {saveState === 'ok' ? 'Salvo' : saveState === 'saving' ? 'Salvando…' : 'Erro ao salvar'}
        </span>
        <span className="tl-grow" />
        <button className="icon kbd-btn" onClick={() => setHelpOpen(true)} title="Atalhos (?)" aria-label="Atalhos de teclado">
          <Keyboard size={18} aria-hidden="true" />
        </button>
        <button
          className="primary export-cta"
          onClick={() => {
            setExportMounted(true);
            setExportOpen(true);
          }}
        >
          <Download size={16} aria-hidden="true" /> Exportar
        </button>
      </header>

      <main className="workspace">
        <aside className="panel left" aria-label="Biblioteca">
          <Library
            project={project}
            apply={apply}
            selection={selection}
            onSelect={setSelection}
            currentMs={currentMs}
            seekMs={seekMs}
            activeTab={libTab}
            onTabChange={setLibTab}
            personPanel={
              <>
                <PersonPanel project={project} playableSrc={playable?.video.src ?? null} apply={apply} hasMasks={!!maskUrls} />
                <Camera3DPanel project={project} playableSrc={playable?.video.src ?? null} apply={apply} phraseId={selection.phraseId} currentMs={currentMs} />
              </>
            }
          />
        </aside>

        <section className="viewer" aria-label="Monitor">
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
            />
          ) : (
            <div className={videoError ? 'error' : 'muted'} style={{ padding: 16 }}>
              {videoError || 'Carregando vídeo…'}
            </div>
          )}
        </section>

        <aside className="panel right" aria-label="Inspetor">
          {selected ? (
            <PhrasePanel
              key={selected.id}
              project={project}
              phrase={selected}
              wordId={selection.wordId}
              onSelectWord={(wordId) => setSelection({ phraseId: selected.id, wordId })}
              apply={apply}
            />
          ) : (
            <div className="empty-inspector">
              <SlidersHorizontal size={28} aria-hidden="true" />
              <p>Selecione uma legenda no monitor, na timeline ou na lista.</p>
              {active && (
                <button onClick={() => setSelection({ phraseId: active.id, wordId: null })}>Editar a frase na agulha</button>
              )}
              <p className="muted small">Dica: clique de novo numa palavra (ou Alt + clique) para editar só ela.</p>
            </div>
          )}
        </aside>

        <Timeline
          project={project}
          apply={apply}
          currentMs={currentMs}
          playing={playing}
          seekMs={seekMs}
          selection={selection}
          onSelect={setSelection}
          onSplit={splitAtPlayhead}
          onDuplicate={duplicate}
          onDelete={remove}
          onAdd={addAtPlayhead}
          mediaUrl={playable?.video.src ?? null}
        />
      </main>

      {(exportOpen || exportMounted) && playable && (
        <div
          className="modal-back"
          style={{ display: exportOpen ? 'flex' : 'none' }}
          onPointerDown={(e) => e.target === e.currentTarget && setExportOpen(false)}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label="Exportar">
            <button className="icon close" onClick={() => setExportOpen(false)} aria-label="Fechar">
              <X size={18} aria-hidden="true" />
            </button>
            <ExportPanel project={playable} maskUrls={activeMasks} personMasks={maskUrls} />
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && setHelpOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Atalhos de teclado">
            <button className="icon close" onClick={() => setHelpOpen(false)} aria-label="Fechar">
              <X size={18} aria-hidden="true" />
            </button>
            <h3>Atalhos</h3>
            <dl className="shortcuts">
              {SHORTCUTS.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>
                    <kbd>{k}</kbd>
                  </dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};
