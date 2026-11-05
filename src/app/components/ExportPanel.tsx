import React, { useState } from 'react';
import { toAss, toSrt } from '../../core/exporters';
import type { Project } from '../../core/types';
import { downloadUrl, renderStatus, startRender } from '../api';

const FORMATS: { id: string; label: string; hint: string }[] = [
  { id: 'mov-alpha', label: 'MOV transparente', hint: 'Premiere e CapCut desktop: arraste como camada acima do vídeo.' },
  { id: 'mp4-green', label: 'MP4 fundo verde', hint: 'CapCut celular: sobreposição → Remover fundo/Chroma key no verde.' },
  { id: 'webm-alpha', label: 'WebM transparente', hint: 'Alternativa transparente leve (navegador, alguns editores).' },
  { id: 'mp4-final', label: 'MP4 final', hint: 'Vídeo pronto com legenda gravada, para postar.' },
];

function saveText(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

type Job = { id: string; format: string; progress: number; status: string; error?: string };

export const ExportPanel: React.FC<{ project: Project }> = ({ project }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const base = project.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'legendas';

  const render = async (format: string) => {
    setError('');
    try {
      const { id } = await startRender(project, format);
      setJobs((j) => [{ id, format, progress: 0, status: 'queued' }, ...j]);
      const poll = async () => {
        try {
          const s = await renderStatus(id);
          setJobs((j) => j.map((x) => (x.id === id ? { ...x, progress: s.progress, status: s.status, error: s.error } : x)));
          if (s.status === 'queued' || s.status === 'rendering') setTimeout(poll, 800);
        } catch (e) {
          setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'error', error: (e as Error).message } : x)));
        }
      };
      poll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="export">
      <h3>Exportar</h3>
      <div className="row wrap">
        {FORMATS.map((f) => (
          <button key={f.id} onClick={() => render(f.id)} title={f.hint}>
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
      {error && <div className="error">{error}</div>}
      {jobs.map((j) => (
        <div key={j.id} className="job">
          <span>{FORMATS.find((f) => f.id === j.format)?.label}</span>
          {j.status === 'done' ? (
            <a href={downloadUrl(j.id)}>Baixar</a>
          ) : j.status === 'error' ? (
            <span className="error">{j.error}</span>
          ) : (
            <progress value={j.progress} max={1} />
          )}
        </div>
      ))}
    </div>
  );
};
