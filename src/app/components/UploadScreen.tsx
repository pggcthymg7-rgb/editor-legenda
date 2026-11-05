import React, { useEffect, useState } from 'react';
import { createProject } from '../../core/grouping';
import type { Project, TranscribedWord } from '../../core/types';
import { getStatus, listProjects, loadProject, transcribeOpenAi, uploadVideo } from '../api';
import type { LocalModel } from '../transcribe';

type Engine = 'local' | 'openai' | 'none';

function readMeta(file: File): Promise<{ width: number; height: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      resolve({ width: v.videoWidth, height: v.videoHeight, durationMs: Math.round(v.duration * 1000) });
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => reject(new Error('Não consegui ler o vídeo'));
    v.src = URL.createObjectURL(file);
  });
}

export const UploadScreen: React.FC<{ onReady: (p: Project) => void }> = ({ onReady }) => {
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<Engine>('local');
  const [model, setModel] = useState<LocalModel>('small');
  const [openai, setOpenai] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [progress, setProgress] = useState<number | undefined>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getStatus()
      .then((s) => setOpenai(s.openai))
      .catch(() => setError('Servidor local fora do ar. Rode: npm run dev'));
    listProjects().then(setSaved).catch(() => undefined);
  }, []);

  const status = (m: string, p?: number) => {
    setMsg(m);
    setProgress(p);
  };

  const start = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const meta = await readMeta(file);
      status('Enviando vídeo…', 0);
      const up = await uploadVideo(file, (p) => status('Enviando vídeo…', p));
      let words: TranscribedWord[] = [];
      if (engine === 'local') {
        // carrega o Whisper só quando usado (pacote pesado)
        const { transcribeLocal } = await import('../transcribe');
        words = await transcribeLocal(file, model, status);
      }
      if (engine === 'openai') {
        status('Transcrevendo na OpenAI…');
        words = (await transcribeOpenAi(up.name)).words;
      }
      const project = createProject({ src: up.url, ...meta, fps: 30 }, words, file.name.replace(/\.[^.]+$/, ''));
      onReady(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upload">
      <h1>Editor de Legendas</h1>
      <p className="muted">Vídeo → transcrição → legendas animadas editáveis → export para Premiere/CapCut.</p>

      <label className="drop">
        <input type="file" accept="video/mp4,video/quicktime,video/webm,.m4v" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
        {file ? <strong>{file.name}</strong> : <span>Clique para escolher o vídeo (mp4, mov, webm)</span>}
      </label>

      <fieldset disabled={busy}>
        <legend>Transcrição</legend>
        <label>
          <input type="radio" checked={engine === 'local'} onChange={() => setEngine('local')} /> Local (grátis, no seu Mac)
        </label>
        {engine === 'local' && (
          <select value={model} onChange={(e) => setModel(e.target.value as LocalModel)}>
            <option value="small">small — rápido</option>
            <option value="medium">medium — mais preciso</option>
            <option value="large-v3-turbo">large-v3-turbo — melhor, mais pesado</option>
          </select>
        )}
        <label title={openai ? '' : 'Coloque OPENAI_API_KEY no arquivo .env e reinicie'}>
          <input type="radio" checked={engine === 'openai'} onChange={() => setEngine('openai')} disabled={!openai} /> API OpenAI
          {!openai && <span className="muted"> (sem chave no .env)</span>}
        </label>
        <label>
          <input type="radio" checked={engine === 'none'} onChange={() => setEngine('none')} /> Sem transcrição (digito eu)
        </label>
      </fieldset>

      <button className="primary" onClick={start} disabled={!file || busy}>
        {busy ? 'Processando…' : 'Criar legendas'}
      </button>

      {busy && (
        <div className="status">
          {msg}
          {progress !== undefined && <progress value={progress} max={1} />}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {saved.length > 0 && (
        <div className="saved">
          <h3>Projetos salvos</h3>
          {saved.map((s) => (
            <button key={s.id} onClick={() => loadProject(s.id).then(onReady).catch((e) => setError(e.message))}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
