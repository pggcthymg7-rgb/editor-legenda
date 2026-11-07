import type { PlayerRef } from '@remotion/player';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { duplicatePhrase, sortPhrases, splitPhraseAt } from '../../core/edit';
import { buildPhrase, phraseEnd, phraseStart } from '../../core/grouping';
import type { Word } from '../../core/types';
import { FPS } from '../../remotion/Root';
import type { Selection } from '../components/Timeline';
import { platform } from '../platform';
import { useProjectStore } from '../store';

export function useEditor() {
  const { project, apply, load, undo, redo, canUndo, canRedo } = useProjectStore();
  const [selection, setSelection] = useState<Selection>({ phraseId: null, wordId: null });
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saveState, setSaveState] = useState<'ok' | 'saving' | 'error'>('ok');
  const playerRef = useRef<PlayerRef | null>(null);
  const [playableSrc, setPlayableSrc] = useState<{ src: string; url: string } | null>(null);
  const [videoError, setVideoError] = useState('');
  const [maskUrls, setMaskUrls] = useState<string[] | undefined>();

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

  // máscaras da pessoa (se a análise já foi feita)
  const maskCount = project?.video.mask?.count ?? 0;
  useEffect(() => {
    let alive = true;
    if (!maskCount || !src) return setMaskUrls(undefined);
    platform
      .maskUrls(src, maskCount)
      .then((u) => alive && setMaskUrls(u))
      .catch(() => alive && setMaskUrls(undefined));
    return () => {
      alive = false;
    };
  }, [src, maskCount]);

  const playable = useMemo(
    () =>
      project && playableSrc?.src === project.video.src ? { ...project, video: { ...project.video, src: playableSrc.url } } : null,
    [project, playableSrc],
  );
  const occlusionOn = project?.occlusion !== false;
  const activeMasks = occlusionOn ? maskUrls : undefined;

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

  const seekMs = useCallback((ms: number) => playerRef.current?.seekTo(Math.round((ms / 1000) * FPS)), []);

  const onMovePhrase = useCallback(
    (id: string, x: number, y: number) =>
      apply((p) => ({ ...p, phrases: p.phrases.map((ph) => (ph.id === id ? { ...ph, x, y } : ph)) }), true),
    [apply],
  );
  const onTransformPhrase = useCallback(
    (id: string, patch: { scale?: number; rotation?: number }) =>
      apply((p) => ({ ...p, phrases: p.phrases.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)) }), true),
    [apply],
  );
  const onMoveWord = useCallback(
    (phraseId: string, wordId: string, patch: Partial<Word>) =>
      apply(
        (p) => ({
          ...p,
          phrases: p.phrases.map((ph) =>
            ph.id === phraseId ? { ...ph, words: ph.words.map((w) => (w.id === wordId ? { ...w, ...patch } : w)) } : ph,
          ),
        }),
        true,
      ),
    [apply],
  );

  const addAtPlayhead = useCallback(() => {
    if (!project) return;
    const ph = buildPhrase([{ text: 'Texto', startMs: currentMs, endMs: Math.min(project.video.durationMs, currentMs + 1000) }], 'p1-editorial', project.customPresets);
    apply((proj) => ({ ...proj, phrases: sortPhrases([...proj.phrases, ph]) }));
    setSelection({ phraseId: ph.id, wordId: null });
  }, [apply, currentMs, project]);

  const splitAtPlayhead = useCallback(() => {
    if (!project) return;
    const targetId =
      selection.phraseId ?? project.phrases.find((p) => currentMs >= phraseStart(p) && currentMs < phraseEnd(p))?.id;
    if (!targetId) return;
    apply((proj) => ({ ...proj, phrases: splitPhraseAt(proj.phrases, targetId, currentMs) }));
  }, [apply, project, selection.phraseId, currentMs]);

  const duplicate = useCallback(() => {
    if (!project || !selection.phraseId) return;
    const r = duplicatePhrase(project.phrases, selection.phraseId);
    apply((proj) => ({ ...proj, phrases: r.phrases }));
    setSelection({ phraseId: r.id, wordId: null });
  }, [apply, project, selection.phraseId]);

  const remove = useCallback(() => {
    if (!selection.phraseId) return;
    apply((proj) => ({ ...proj, phrases: proj.phrases.filter((p) => p.id !== selection.phraseId) }));
    setSelection({ phraseId: null, wordId: null });
  }, [apply, selection.phraseId]);

  const closeProject = useCallback(async () => {
    if (project && saveState === 'saving') {
      await platform.saveProject(project).catch(() => undefined);
    }
    load(null);
  }, [project, saveState, load]);

  // avisa antes de fechar com alteração ainda não salva
  useEffect(() => {
    if (saveState === 'ok') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // seleção some se a frase foi apagada (desfazer etc.)
  useEffect(() => {
    if (project && selection.phraseId && !project.phrases.some((p) => p.id === selection.phraseId)) {
      setSelection({ phraseId: null, wordId: null });
    }
  }, [project, selection.phraseId]);

  const selected = project?.phrases.find((p) => p.id === selection.phraseId) ?? null;
  const active = project?.phrases.find((p) => currentMs >= phraseStart(p) && currentMs < phraseEnd(p));

  return {
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
  };
}

export type EditorState = ReturnType<typeof useEditor>;
