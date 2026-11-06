import { Box, Loader2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { phraseEnd, phraseStart } from '../../core/grouping';
import type { Project } from '../../core/types';
import { type AnchorMode, makeAnchor } from '../../tracking3d/model';
import { TrackView } from './TrackView';

const KIND = { parede: 'na parede', chao: 'no chão', teto: 'no teto', frente: 'de frente para a câmera' } as const;

type Props = {
  project: Project;
  playableSrc: string | null;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  phraseId: string | null;
  currentMs: number;
};

/** Painel "Câmera 3D": rastreia a câmera e gruda frases na cena com perspectiva e parallax. */
export const Camera3DPanel: React.FC<Props> = ({ project, playableSrc, apply, phraseId, currentMs }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const [precise, setPrecise] = useState(false);
  useEffect(() => {
    void import('../track3d/analyze').then((m) => m.colmapReady()).then(setPrecise);
  }, []);
  const tr = project.video.track3d;
  const target =
    project.phrases.find((p) => p.id === phraseId) ?? project.phrases.find((p) => currentMs >= phraseStart(p) && currentMs < phraseEnd(p));
  const anchored = project.phrases.filter((p) => p.anchor3d).length;

  const run = async (engine: 'device' | 'precise' = 'device') => {
    if (!playableSrc) return;
    setBusy(true);
    setError('');
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const { analyzeCamera, analyzeCameraPrecise } = await import('../track3d/analyze');
      const fn: typeof analyzeCamera = engine === 'precise' ? (_s, d, p, sig) => analyzeCameraPrecise(project.video.src, d, p, sig) : analyzeCamera;
      const { track, stats } = await fn(playableSrc, project.video.durationMs, (p, m) => (setProgress(p), setMsg(m)), ctrl.signal);
      // reanálise muda a escala da cena: âncoras antigas deixam de valer
      apply((proj) => ({
        ...proj,
        video: { ...proj.video, track3d: track },
        phrases: proj.phrases.map((p) => (p.anchor3d ? { ...p, anchor3d: undefined } : p)),
      }));
      setMsg(`Pronto em ${(stats.ms / 1000).toFixed(1)} s · ${stats.frames} quadros · erro ${track.err.toFixed(2)} px. Agora grude uma frase.`);
    } catch (e) {
      setError(ctrl.signal.aborted ? 'Análise cancelada.' : (e as Error).message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const stick = (mode: AnchorMode, at?: { x: number; y: number }) => {
    if (!tr || !target) return;
    const { width, height } = project.video;
    const x = at?.x ?? target.x;
    const y = at?.y ?? target.y;
    const a = makeAnchor(tr, currentMs, x * width, y * height, width, height, mode);
    if (!a) return setError('Não achei pontos da cena nesse lugar. Toque sobre uma superfície com textura.');
    setError('');
    apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => (p.id === target.id ? { ...p, x, y, anchor3d: a } : p)) }));
  };
  const release = () =>
    target && apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => (p.id === target.id ? { ...p, anchor3d: undefined } : p)) }));

  return (
    <div className="person" data-testid="camera3d-panel">
      <div className="person-head">
        <Box size={22} aria-hidden="true" />
        <div>
          <strong>Câmera 3D (grudar na cena)</strong>
          <p className="muted small">
            Rastreia o movimento da câmera em 3D (no próprio aparelho). A frase gruda na parede ou chão com perspectiva real.
          </p>
        </div>
      </div>
      {tr ? (
        <p className="ok small" role="status">
          Câmera rastreada: {tr.poses.length} quadros, {tr.points.length} pontos 3D, erro {tr.err.toFixed(2)} px.
        </p>
      ) : (
        <p className="muted small">Ainda não analisado.</p>
      )}
      <div className="row wrap">
        <button className="primary" onClick={() => run('device')} disabled={busy || !playableSrc} data-testid="camera3d-analyze">
          {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null} {tr ? 'Refazer análise' : 'Analisar câmera'}
        </button>
        {precise && (
          <button className="primary" onClick={() => run('precise')} disabled={busy || !project.video.src} data-testid="camera3d-analyze-precise" title="COLMAP no Mac: mais lento, máxima exatidão">
            Precisão máxima (Mac + COLMAP)
          </button>
        )}
        {busy && <button onClick={() => abort.current?.abort()}>Cancelar</button>}
      </div>
      {busy && <progress value={progress} max={1} style={{ width: '100%' }} />}
      {msg && <p className="small">{msg}</p>}
      {error && <p className="error small" role="alert">{error}</p>}
      {tr && (
        <>
          <p className="muted small">
            Posicione a frase sobre a parede/chão no quadro atual e grude. “De frente” mantém a frase virada para a câmera (só com parallax). {anchored ? `${anchored} frase(s) grudada(s).` : ''}
          </p>
          {playableSrc && (
            <TrackView
              src={playableSrc}
              track={tr}
              tMs={currentMs}
              compW={project.video.width}
              compH={project.video.height}
              anchor={target?.anchor3d}
              onPick={(x, y) => (target ? stick('auto', { x, y }) : setError('Selecione uma frase antes de tocar na cena.'))}
            />
          )}
          <div className="row wrap">
            <button onClick={() => stick('auto')} disabled={!target} data-testid="camera3d-stick">
              Grudar na superfície
            </button>
            <button onClick={() => stick('frente')} disabled={!target} data-testid="camera3d-stick-front">
              Grudar de frente
            </button>
            {target?.anchor3d && <button onClick={release}>Soltar</button>}
          </div>
          {target?.anchor3d && (
            <p className="ok small" data-testid="camera3d-kind">
              “{target.words.map((w) => w.text).join(' ').slice(0, 28)}” grudada {KIND[target.anchor3d.kind ?? 'frente']}.
              {target.anchor3d.kind === 'teto' || target.anchor3d.kind === 'chao' ? ' Se queria na parede, mova a frase para cima dela ou use “Grudar de frente”.' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
};
