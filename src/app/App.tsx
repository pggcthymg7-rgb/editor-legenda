import type { PlayerRef } from '@remotion/player';
import {
  ChevronLeft,
  Clapperboard,
  Copy,
  Download,
  FilePlus2,
  Keyboard,
  Layers,
  ListOrdered,
  Redo2,
  Replace,
  Scissors,
  SlidersHorizontal,
  Trash2,
  Type,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { duplicatePhrase, setWordTime, sortPhrases, splitPhraseAt } from '../core/edit';
import { buildPhrase, phraseEnd, phraseStart, shiftPhrase } from '../core/grouping';
import type { Project, Word } from '../core/types';
import { FPS } from '../remotion/Root';
import { ExportPanel } from './components/ExportPanel';
import { Library, type LibTab } from './components/Library';
import { PersonPanel } from './components/PersonPanel';
import { Camera3DPanel } from './components/Camera3DPanel';
import { PhrasePanel } from './components/PhrasePanel';
import { Preview } from './components/Preview';
import { Timeline, type Selection } from './components/Timeline';
import { UploadScreen } from './components/UploadScreen';
import { platform } from './platform';
import { useProjectStore } from './store';

type MobileTab = 'biblioteca' | 'inspetor';

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
  const { project, apply, load, undo, redo, canUndo, canRedo } = useProjectStore();
  const [selection, setSelection] = useState<Selection>({ phraseId: null, wordId: null });
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saveState, setSaveState] = useState<'ok' | 'saving' | 'error'>('ok');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMounted, setExportMounted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('inspetor');
  const [mobileSheet, setMobileSheet] = useState<MobileTab | null>(null);
  const [libTab, setLibTab] = useState<LibTab>('frases');
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

  // avisa antes de fechar com alteração ainda não salva
  useEffect(() => {
    if (saveState === 'ok') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // atalhos de teclado estilo NLE
  useEffect(() => {
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
  }, [undo, redo, duplicate, splitAtPlayhead, addAtPlayhead, remove, apply, selection, currentMs, project, exportOpen, helpOpen]);

  // seleção some se a frase foi apagada (desfazer etc.)
  useEffect(() => {
    if (project && selection.phraseId && !project.phrases.some((p) => p.id === selection.phraseId)) setSelection({ phraseId: null, wordId: null });
  }, [project, selection.phraseId]);

  useEffect(() => {
    if (!selection.phraseId && mobileSheet === 'inspetor') setMobileSheet(null);
  }, [selection.phraseId, mobileSheet]);

  if (!project) return <UploadScreen onReady={(p: Project) => load(p)} />;

  const selected = project.phrases.find((p) => p.id === selection.phraseId) ?? null;
  const active = project.phrases.find((p) => currentMs >= phraseStart(p) && currentMs < phraseEnd(p));

  const openLibSheet = (t: LibTab) => {
    setLibTab(t);
    setMobileTab('biblioteca');
    setMobileSheet((cur) => (cur === 'biblioteca' && libTab === t ? null : 'biblioteca'));
  };

  return (
    <div className="editor" data-mtab={mobileTab} data-msheet={mobileSheet ?? 'none'}>
      <header className="topbar">
        <span className="brand" aria-hidden="true">
          <Clapperboard size={18} />
        </span>
        <button
          className="back-btn"
          onClick={async () => {
            if (project && saveState === 'saving') await platform.saveProject(project).catch(() => undefined);
            setExportOpen(false);
            setExportMounted(false);
            load(null);
          }}
          title="Abrir outro vídeo"
          aria-label="Abrir outro vídeo"
        >
          <ChevronLeft size={18} className="only-sm" aria-hidden="true" />
          <FilePlus2 size={16} className="hide-sm" aria-hidden="true" /> <span className="hide-sm">Novo</span>
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
          <div className="sheet-bar only-sm">
            <span className="sheet-grabber" aria-hidden="true" />
            <div className="sheet-bar-row">
              <strong>Biblioteca</strong>
              <button className="icon" onClick={() => setMobileSheet(null)} aria-label="Fechar painel">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
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
              onSelect={(s) => {
                setSelection(s);
                if (s.phraseId) setMobileTab('inspetor');
              }}
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
          <div className="sheet-bar only-sm">
            <span className="sheet-grabber" aria-hidden="true" />
            <div className="sheet-bar-row">
              <strong>Inspetor de Legenda</strong>
              <button className="icon" onClick={() => setMobileSheet(null)} aria-label="Fechar inspetor">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
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

        <nav className="mobile-dock" role="toolbar" aria-label="Ferramentas do editor">
          {selected ? (
            <div className="dock-row contextual" key="selected-dock">
              <button
                className={`dock-btn ${mobileSheet === 'inspetor' ? 'on' : ''}`}
                onClick={() => {
                  setMobileTab('inspetor');
                  setMobileSheet((cur) => (cur === 'inspetor' ? null : 'inspetor'));
                }}
              >
                <SlidersHorizontal size={20} aria-hidden="true" />
                <span>Editar</span>
              </button>
              <button
                className={`dock-btn ${mobileSheet === 'biblioteca' && libTab === 'modelos' ? 'on' : ''}`}
                onClick={() => openLibSheet('modelos')}
              >
                <Layers size={20} aria-hidden="true" />
                <span>Modelos</span>
              </button>
              <button
                className="dock-btn"
                onClick={splitAtPlayhead}
                disabled={selected.words.length < 2}
              >
                <Scissors size={20} aria-hidden="true" />
                <span>Dividir</span>
              </button>
              <button className="dock-btn" onClick={duplicate}>
                <Copy size={20} aria-hidden="true" />
                <span>Duplicar</span>
              </button>
              <button
                className="dock-btn danger-soft"
                onClick={() => {
                  remove();
                  setMobileSheet(null);
                }}
              >
                <Trash2 size={20} aria-hidden="true" />
                <span>Excluir</span>
              </button>
              <button
                className="dock-btn"
                onClick={() => {
                  setSelection({ phraseId: null, wordId: null });
                  setMobileSheet(null);
                }}
                aria-label="Tirar seleção"
              >
                <X size={20} aria-hidden="true" />
                <span>Fechar</span>
              </button>
            </div>
          ) : (
            <div className="dock-row" key="default-dock">
              <button
                className="dock-btn"
                onClick={() => {
                  addAtPlayhead();
                  setMobileTab('inspetor');
                  setMobileSheet('inspetor');
                }}
              >
                <Type size={20} aria-hidden="true" />
                <span>+ Texto</span>
              </button>
              <button
                className={`dock-btn ${mobileSheet === 'biblioteca' && libTab === 'modelos' ? 'on' : ''}`}
                onClick={() => openLibSheet('modelos')}
              >
                <Layers size={20} aria-hidden="true" />
                <span>Modelos</span>
              </button>
              <button
                className={`dock-btn ${mobileSheet === 'biblioteca' && libTab === 'frases' ? 'on' : ''}`}
                onClick={() => openLibSheet('frases')}
              >
                <ListOrdered size={20} aria-hidden="true" />
                <span>Frases</span>
              </button>
              <button
                className={`dock-btn ${mobileSheet === 'biblioteca' && libTab === 'texto' ? 'on' : ''}`}
                onClick={() => openLibSheet('texto')}
              >
                <Replace size={20} aria-hidden="true" />
                <span>Buscar</span>
              </button>
              <button
                className={`dock-btn ${mobileSheet === 'biblioteca' && libTab === 'pessoa' ? 'on' : ''}`}
                onClick={() => openLibSheet('pessoa')}
              >
                <UserRound size={20} aria-hidden="true" />
                <span>Pessoa</span>
              </button>
              {active && (
                <button
                  className="dock-btn"
                  onClick={() => {
                    setSelection({ phraseId: active.id, wordId: null });
                    setMobileTab('inspetor');
                    setMobileSheet('inspetor');
                  }}
                >
                  <SlidersHorizontal size={20} aria-hidden="true" />
                  <span>Na agulha</span>
                </button>
              )}
            </div>
          )}
        </nav>

        <Timeline
          project={project}
          apply={apply}
          currentMs={currentMs}
          playing={playing}
          seekMs={seekMs}
          selection={selection}
          onSelect={(s) => {
            setSelection(s);
            if (s.phraseId) setMobileTab('inspetor');
          }}
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
