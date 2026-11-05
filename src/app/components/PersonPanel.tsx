import { Loader2, UserRound } from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { Project } from '../../core/types';
import { platform } from '../platform';

type Props = {
  project: Project;
  /** URL tocável do vídeo (blob no iPhone, /media no Mac) */
  playableSrc: string | null;
  apply: (fn: (p: Project) => Project, merge?: boolean) => void;
  hasMasks: boolean;
};

/** Painel "Pessoa": analisa o vídeo e libera a legenda atrás da pessoa (opcional). */
export const PersonPanel: React.FC<Props> = ({ project, playableSrc, apply, hasMasks }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const mask = project.video.mask;
  const on = project.occlusion !== false;
  const behindCount = project.phrases.filter((p) => p.behind).length;

  const run = async () => {
    if (!playableSrc) return;
    setBusy(true);
    setError('');
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const { analyzePerson } = await import('../person/segment');
      const r = await analyzePerson(playableSrc, project.video.durationMs, (p, m) => (setProgress(p * 0.85), setMsg(m)), ctrl.signal);
      setMsg('Guardando máscaras…');
      await platform.saveMasks(project.video.src, r.frames, (p) => setProgress(0.85 + p * 0.15));
      apply((proj) => ({
        ...proj,
        occlusion: true,
        video: { ...proj.video, mask: { count: r.frames.length, fps: r.fps, width: r.width, height: r.height } },
      }));
      setMsg('Pronto! Marque “Legenda atrás da pessoa” nas frases que quiser.');
    } catch (e) {
      setError(ctrl.signal.aborted ? 'Análise cancelada.' : (e as Error).message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const setAllBehind = (behind: boolean) =>
    apply((proj) => ({ ...proj, phrases: proj.phrases.map((p) => ({ ...p, behind })) }));

  return (
    <div className="person">
      <div className="person-head">
        <UserRound size={22} aria-hidden="true" />
        <div>
          <strong>Legenda atrás da pessoa</strong>
          <p className="muted small">
            Recorta a pessoa do vídeo (IA no próprio aparelho) para o texto passar por trás dela. Opcional: o vídeo original não é alterado.
          </p>
        </div>
      </div>

      {mask ? (
        <p className="ok small" role="status">
          Análise feita: {mask.count} quadros{hasMasks ? '' : ' (carregando…)'}.
        </p>
      ) : (
        <p className="muted small">Ainda não analisado.</p>
      )}

      <div className="row wrap">
        <button className="primary" onClick={run} disabled={busy || !playableSrc}>
          {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null} {mask ? 'Refazer análise' : 'Analisar pessoa'}
        </button>
        {busy && <button onClick={() => abort.current?.abort()}>Cancelar</button>}
      </div>
      {busy && (
        <div className="status">
          <span>{msg}</span>
          <progress value={progress} max={1} />
        </div>
      )}
      {!busy && msg && !error && <p className="muted small">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {mask && (
        <>
          <h4>Uso</h4>
          <label className="check">
            <input type="checkbox" checked={on} onChange={(e) => apply((p) => ({ ...p, occlusion: e.target.checked }))} />
            Ativar efeito (desligue para ver só a camada original)
          </label>
          <p className="muted small">{behindCount} de {project.phrases.length} frases atrás da pessoa.</p>
          <div className="row wrap">
            <button onClick={() => setAllBehind(true)}>Todas atrás</button>
            <button onClick={() => setAllBehind(false)}>Todas na frente</button>
          </div>
          <p className="muted small">
            Na exportação você também pode gerar a <strong>camada da pessoa</strong> (só a pessoa recortada, fundo transparente) para empilhar no Premiere/CapCut.
          </p>
        </>
      )}
    </div>
  );
};
