import type { PlayerRef } from '@remotion/player';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '../core/types';
import { saveProject } from './api';
import { ExportPanel } from './components/ExportPanel';
import { PhraseList } from './components/PhraseList';
import { PhrasePanel } from './components/PhrasePanel';
import { Preview } from './components/Preview';
import { UploadScreen } from './components/UploadScreen';
import { useProjectStore } from './store';
import { FPS } from '../remotion/Root';

export const App: React.FC = () => {
  const { project, apply, load, undo, redo, canUndo, canRedo } = useProjectStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [saveState, setSaveState] = useState<'ok' | 'saving' | 'error'>('ok');
  const playerRef = useRef<PlayerRef | null>(null);

  // salva sozinho 1,5 s depois da última mudança
  useEffect(() => {
    if (!project) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      saveProject(project)
        .then(() => setSaveState('ok'))
        .catch(() => setSaveState('error'));
    }, 1500);
    return () => clearTimeout(t);
  }, [project]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const seekMs = useCallback((ms: number) => playerRef.current?.seekTo(Math.round((ms / 1000) * FPS)), []);
  const onMove = useCallback(
    (id: string, x: number, y: number) =>
      apply((p) => ({ ...p, phrases: p.phrases.map((ph) => (ph.id === id ? { ...ph, x, y } : ph)) }), true),
    [apply],
  );

  if (!project) return <UploadScreen onReady={(p: Project) => load(p)} />;

  const selected = project.phrases.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="editor">
      <header>
        <input
          className="name"
          value={project.name}
          onChange={(e) => apply((p) => ({ ...p, name: e.target.value.slice(0, 120) }), true)}
        />
        <button onClick={undo} disabled={!canUndo} title="Desfazer (⌘Z)">
          Desfazer
        </button>
        <button onClick={redo} disabled={!canRedo} title="Refazer (⇧⌘Z)">
          Refazer
        </button>
        <span className={`save ${saveState}`}>{saveState === 'ok' ? 'Salvo' : saveState === 'saving' ? 'Salvando…' : 'Erro ao salvar'}</span>
        <button onClick={() => load(null)}>Novo vídeo</button>
      </header>
      <main>
        <aside className="left">
          <PhraseList project={project} apply={apply} selectedId={selectedId} onSelect={setSelectedId} currentMs={currentMs} seekMs={seekMs} />
        </aside>
        <section className="center">
          <Preview project={project} playerRef={playerRef} selectedId={selectedId} onMove={onMove} onTime={setCurrentMs} />
          <ExportPanel project={project} />
        </section>
        <aside className="right">
          {selected ? (
            <PhrasePanel key={selected.id} project={project} phrase={selected} apply={apply} />
          ) : (
            <p className="muted">Selecione uma frase na lista para editar posição, estilo, animação e palavras.</p>
          )}
        </aside>
      </main>
    </div>
  );
};
