import React, { useEffect, useState } from 'react';
import { createProject } from '../../core/grouping';
import type { Project, TranscribedWord } from '../../core/types';
import { getKey, isPlausibleKey, setKey } from '../platform/openai-browser';
import { isIOS, platform, type ProjectSummary } from '../platform';
import type { LocalModel } from '../transcribe';

type Engine = 'local' | 'openai' | 'none';

function readMeta(file: File): Promise<{ width: number; height: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => {
      resolve({ width: v.videoWidth, height: v.videoHeight, durationMs: Math.round(v.duration * 1000) });
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => reject(new Error('Não consegui ler o vídeo'));
    v.src = URL.createObjectURL(file);
  });
}

/** Chave da OpenAI do próprio usuário, guardada só neste aparelho (versão iPhone). */
const KeySettings: React.FC<{ onChange: (has: boolean) => void }> = ({ onChange }) => {
  const [has, setHas] = useState(Boolean(getKey()));
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const save = () => {
    if (!isPlausibleKey(value)) return setErr('Chave deve começar com sk-');
    setKey(value);
    setValue('');
    setErr('');
    setHas(true);
    onChange(true);
  };
  const clear = () => {
    setKey(null);
    setHas(false);
    onChange(false);
  };
  return (
    <div className="keybox">
      {has ? (
        <div className="row">
          <span>Chave OpenAI salva neste aparelho.</span>
          <button className="danger" onClick={clear}>
            Apagar chave
          </button>
        </div>
      ) : (
        <>
          <div className="row">
            <input
              className="text"
              type="password"
              autoComplete="off"
              placeholder="sk-… (sua chave OpenAI)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button onClick={save}>Salvar</button>
          </div>
          <span className="muted">Fica só neste aparelho. O áudio vai direto para a OpenAI.</span>
        </>
      )}
      {err && <div className="error">{err}</div>}
    </div>
  );
};

export const UploadScreen: React.FC<{ onReady: (p: Project) => void }> = ({ onReady }) => {
  const ios = isIOS();
  const device = platform.kind === 'device';
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<Engine>(device ? 'openai' : 'local');
  const [model, setModel] = useState<LocalModel>('small');
  const [openai, setOpenai] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [progress, setProgress] = useState<number | undefined>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<ProjectSummary[]>([]);

  const refreshSaved = () => platform.listProjects().then(setSaved).catch(() => undefined);

  useEffect(() => {
    platform
      .openAiReady()
      .then((ok) => {
        setOpenai(ok);
        if (!ok && device) setEngine('none');
      })
      .catch(() => setError(device ? 'Erro ao ler as configurações' : 'Servidor local fora do ar. Rode: npm run dev'));
    refreshSaved();
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
      status(device ? 'Guardando vídeo no aparelho…' : 'Enviando vídeo…', 0);
      const up = await platform.saveVideo(file, (p) => status(device ? 'Guardando vídeo no aparelho…' : 'Enviando vídeo…', p));
      let words: TranscribedWord[] = [];
      if (engine === 'local') {
        // carrega o Whisper só quando usado (pacote pesado)
        const { transcribeLocal } = await import('../transcribe');
        words = await transcribeLocal(file, model, status);
      }
      if (engine === 'openai') words = await platform.transcribeOpenAi(up.ref, status);
      const project = createProject({ src: up.src, ...meta, fps: 30 }, words, file.name.replace(/\.[^.]+$/, ''));
      onReady(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!platform.deleteProject || !confirm(`Apagar "${name}" e o vídeo dele deste aparelho?`)) return;
    await platform.deleteProject(id).catch((e) => setError((e as Error).message));
    refreshSaved();
  };

  return (
    <div className="upload">
      <h1>Editor de Legendas</h1>
      <p className="muted">Vídeo → transcrição → legendas animadas editáveis → export para Premiere/CapCut.</p>

      <label className="drop">
        <input type="file" accept="video/mp4,video/quicktime,video/webm,.m4v,.mov" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
        {file ? <strong>{file.name}</strong> : <span>Toque para escolher o vídeo (mp4, mov, webm)</span>}
      </label>

      <fieldset disabled={busy}>
        <legend>Transcrição</legend>
        <label title={openai ? '' : device ? 'Salve sua chave abaixo' : 'Coloque OPENAI_API_KEY no arquivo .env e reinicie'}>
          <input type="radio" checked={engine === 'openai'} onChange={() => setEngine('openai')} disabled={!openai} /> API OpenAI
          {!openai && <span className="muted">{device ? ' (salve sua chave abaixo)' : ' (sem chave no .env)'}</span>}
        </label>
        {device && (
          <KeySettings
            onChange={(has) => {
              setOpenai(has);
              setEngine(has ? 'openai' : 'none');
            }}
          />
        )}
        <label>
          <input type="radio" checked={engine === 'local'} onChange={() => setEngine('local')} /> Local, grátis, no aparelho
          {ios && <span className="muted"> (experimental no iPhone, pode travar)</span>}
        </label>
        {engine === 'local' && (
          <select value={model} onChange={(e) => setModel(e.target.value as LocalModel)}>
            <option value="small">small: mais rápido</option>
            {!ios && <option value="medium">medium: mais preciso</option>}
            {!ios && <option value="large-v3-turbo">large-v3-turbo: o melhor, mais pesado</option>}
          </select>
        )}
        <label>
          <input type="radio" checked={engine === 'none'} onChange={() => setEngine('none')} /> Sem transcrição (eu digito)
        </label>
      </fieldset>

      <button className="primary" onClick={start} disabled={!file || busy || (engine === 'openai' && !openai)}>
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
            <div key={s.id} className="row">
              <button onClick={() => platform.loadProject(s.id).then(onReady).catch((e) => setError(e.message))}>{s.name}</button>
              {platform.deleteProject && (
                <button className="danger" title="Apagar do aparelho" onClick={() => remove(s.id, s.name)}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
