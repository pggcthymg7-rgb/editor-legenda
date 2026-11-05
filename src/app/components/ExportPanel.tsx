import React, { useEffect, useRef, useState } from 'react';
import { toAss, toSrt } from '../../core/exporters';
import type { Project } from '../../core/types';
import { safeName } from '../platform/device';
import { platform, type FormatId, type FormatInfo } from '../platform';

function saveText(name: string, text: string) {
  const file = new File([text], name, { type: 'text/plain;charset=utf-8' });
  // iPhone: menu Compartilhar (salvar em Arquivos, mandar para outro app)
  if (platform.kind === 'device' && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => undefined);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

type Job = { id: string; format: FormatId; progress: number; status: 'rendering' | 'done' | 'error'; url?: string; file?: File; error?: string };

/** Tela não apaga durante o render no iPhone (se apagar, o Safari pausa o app). */
async function keepAwake(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    return () => void lock?.release().catch(() => undefined);
  } catch {
    return () => undefined;
  }
}

export const ExportPanel: React.FC<{ project: Project }> = ({ project }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [formats, setFormats] = useState<FormatInfo[] | null>(null);
  const [error, setError] = useState('');
  const aborts = useRef(new Map<string, AbortController>());
  const base = safeName(project.name);
  const { width, height } = project.video;
  const busy = jobs.some((j) => j.status === 'rendering');

  useEffect(() => {
    platform
      .formats(width, height)
      .then(setFormats)
      .catch(() => setFormats([]));
  }, [width, height]);

  const update = (id: string, patch: Partial<Job>) => setJobs((js) => js.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const render = async (format: FormatId) => {
    setError('');
    const id = Math.random().toString(36).slice(2);
    const ctrl = new AbortController();
    aborts.current.set(id, ctrl);
    setJobs((j) => [{ id, format, progress: 0, status: 'rendering' }, ...j]);
    const release = await keepAwake();
    try {
      const r = await platform.render(project, format, (p) => update(id, { progress: p }), ctrl.signal);
      update(id, { status: 'done', url: r.url, file: r.file, progress: 1 });
    } catch (e) {
      update(id, { status: 'error', error: ctrl.signal.aborted ? 'Cancelado' : (e as Error).message });
    } finally {
      release();
      aborts.current.delete(id);
    }
  };

  const share = (file: File) => navigator.share({ files: [file] }).catch(() => undefined);
  const canShare = (file?: File) => Boolean(file && navigator.canShare?.({ files: [file] }));

  return (
    <div className="export">
      <h3>Exportar</h3>
      {platform.kind === 'device' && (
        <p className="muted">O vídeo é gerado no aparelho. Deixe o app aberto até terminar.</p>
      )}
      <div className="row wrap">
        {formats === null && <span className="muted">Checando formatos…</span>}
        {formats?.map((f) => (
          <button key={f.id} onClick={() => render(f.id)} title={f.hint} disabled={platform.kind === 'device' && busy}>
            {f.label}
          </button>
        ))}
        <button onClick={() => saveText(`${base}.srt`, toSrt(project))} title="Só texto e tempo. Qualquer editor.">
          SRT
        </button>
        <button onClick={() => saveText(`${base}.ass`, toAss(project))} title="Texto com fonte, cor e posição (sem animação).">
          ASS
        </button>
      </div>
      {formats?.length === 0 && <div className="muted">Este aparelho não gera vídeo aqui. Use SRT/ASS ou a versão do Mac.</div>}
      {error && <div className="error">{error}</div>}
      {jobs.map((j) => (
        <div key={j.id} className="job">
          <span>{formats?.find((f) => f.id === j.format)?.label ?? j.format}</span>
          {j.status === 'done' ? (
            <>
              {canShare(j.file) && <button onClick={() => share(j.file!)}>Compartilhar</button>}
              <a href={j.url} download={j.file?.name ?? `${base}-${j.format}`}>
                Baixar
              </a>
            </>
          ) : j.status === 'error' ? (
            <span className="error">{j.error}</span>
          ) : (
            <>
              <progress value={j.progress} max={1} />
              <button onClick={() => aborts.current.get(j.id)?.abort()}>Cancelar</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
};
