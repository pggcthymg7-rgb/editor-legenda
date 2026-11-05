import type { PlayerRef } from '@remotion/player';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '../core/types';
import { platform } from './platform';
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
  const [playableSrc, setPlayableSrc] = useState<{ src: string; url: string } | null>(null);
  const [videoError, setVideoError] = useState('');

  // iPhone: vídeo fica no aparelho como local:<id> → vira blob URL para tocar/renderizar
  const src = project?.video.src ?? '';
  useEffect(() => {
    let alive = true;
    setVideoError('');
    platform
      .videoUrl(src)
      .then((url) => alive && setPlayableSrc({ src, url }))
      .catch((e) => alive && setVideoError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [src]);
  const playable = useMemo(
    () =>
      project && playableSrc?.src === project.video.src ? { ...project, video: { ...project.video, src: playableSrc.url } } : null,
    [project, playableSrc],
  );

  // salva sozinho 1,5 s depois da última mudança
  useEffect(() => {
    if (!project) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      platform
        .saveProject(project)
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
          {playable ? (
            <>
              <Preview project={playable} playerRef={playerRef} selectedId={selectedId} onMove={onMove} onTime={setCurrentMs} />
              <ExportPanel project={playable} />
            </>
          ) : (
            <div className={videoError ? 'error' : 'muted'}>{videoError || 'Carregando vídeo…'}</div>
          )}
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
