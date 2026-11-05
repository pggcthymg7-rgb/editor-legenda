import React, { useEffect, useState } from 'react';
import { createProject } from '../../core/grouping';
import type { Project, TranscribedWord } from '../../core/types';
import { getKey, isPlausibleKey, setKey } from '../platform/openai-browser';
import { isIOS, platform, type ProjectSummary } from '../platform';
import type { Lang, LocalModel } from '../transcribe';
import { cloudHealth, type CloudState } from '../cloud';

type Engine = 'cloud' | 'local' | 'openai' | 'none';

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
  const [engine, setEngine] = useState<Engine>('cloud');
  const [model, setModel] = useState<LocalModel>(ios ? 'base' : 'small');
  const [cloud, setCloud] = useState<CloudState>('checking');
  const [lang, setLang] = useState<Lang>('pt');
  // vídeo já guardado/enviado (tentar outro motor não duplica)
  const [saved1, setSaved1] = useState<{ file: File; up: { src: string; ref: string } } | null>(null);
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
      .then(setOpenai)
      .catch(() => setError(device ? 'Erro ao ler as configurações' : 'Servidor local fora do ar. Rode: npm run dev'));
    refreshSaved();
    // acorda o servidor da nuvem já ao abrir (plano grátis dorme)
    cloudHealth().then((st) => {
      setCloud(st);
      if (st !== 'ready') setEngine((e) => (e === 'cloud' ? 'local' : e));
    });
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
      let up = saved1?.file === file ? saved1.up : null;
      if (!up) {
        status(device ? 'Guardando vídeo no aparelho…' : 'Enviando vídeo…', 0);
        up = await platform.saveVideo(file, (p) => status(device ? 'Guardando vídeo no aparelho…' : 'Enviando vídeo…', p));
        setSaved1({ file, up });
      }
      let words: TranscribedWord[] = [];
      const local = async () => {
        // carrega o Whisper só quando usado (pacote pesado)
        const { transcribeLocal } = await import('../transcribe');
        return transcribeLocal(file, model, status, lang);
      };
      if (engine === 'cloud') {
        try {
          words = await platform.transcribeCloud(up.ref, status, lang);
        } catch (e) {
          // nuvem fora: tenta no aparelho sozinho, sem o usuário precisar fazer nada
          status(`Nuvem indisponível (${(e as Error).message}). Tentando no aparelho…`);
          words = await local();
        }
      }
      if (engine === 'local') words = await local();
      if (engine === 'openai') words = await platform.transcribeOpenAi(up.ref, status, lang);
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
        <label className="lang-row">
          Idioma falado
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Idioma falado no vídeo">
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
            <option value="es">Espanhol</option>
            <option value="auto">Detectar sozinho</option>
          </select>
        </label>
        <label>
          <input type="radio" checked={engine === 'cloud'} onChange={() => setEngine('cloud')} disabled={cloud === 'nokey' || cloud === 'offline'} /> Nuvem
          rápida e grátis <span className="badge">recomendado</span>
          <span className="muted small engine-hint">
            {cloud === 'checking'
              ? ' Conectando… (a 1ª vez do dia leva até 1 min)'
              : cloud === 'ready'
                ? ' Pronta. Whisper large-v3-turbo: 1 min de vídeo em segundos.'
                : cloud === 'nokey'
                  ? ' Ainda sem chave grátis no servidor: por enquanto use “No aparelho”.'
                  : ' Sem conexão com a nuvem agora.'}
          </span>
        </label>
        <label>
          <input type="radio" checked={engine === 'local'} onChange={() => setEngine('local')} /> No aparelho, offline
          <span className="muted small engine-hint"> IA roda no próprio {ios ? 'iPhone' : 'computador'}; baixa o modelo uma vez.</span>
        </label>
        {engine === 'local' && (
          <select value={model} onChange={(e) => setModel(e.target.value as LocalModel)} aria-label="Modelo local">
            <option value="base">base: rápido e leve (~200 MB)</option>
            <option value="small">small: mais preciso (~500 MB)</option>
            {!ios && <option value="medium">medium: ainda mais preciso</option>}
            {!ios && <option value="large-v3-turbo">large-v3-turbo: o melhor, pesado</option>}
          </select>
        )}
        <details className="adv">
          <summary>Usar minha própria chave da OpenAI</summary>
          <label title={openai ? '' : device ? 'Salve sua chave abaixo' : 'Coloque OPENAI_API_KEY no arquivo .env e reinicie'}>
            <input type="radio" checked={engine === 'openai'} onChange={() => setEngine('openai')} disabled={!openai} /> API OpenAI
            {!openai && <span className="muted">{device ? ' (salve sua chave abaixo)' : ' (sem chave no .env)'}</span>}
          </label>
          {device && (
            <KeySettings
              onChange={(has) => {
                setOpenai(has);
                if (has) setEngine('openai');
              }}
            />
          )}
        </details>
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
