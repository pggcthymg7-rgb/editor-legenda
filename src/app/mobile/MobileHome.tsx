import { Clapperboard, Film, KeyRound, Plus, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Project } from '../../core/types';
import { getGroqKey, isGroqKey, setGroqKey } from '../cloud';
import { platform, type ProjectSummary } from '../platform';
import { getKey, isPlausibleKey, setKey } from '../platform/openai-browser';
import { formatDateShort, formatDurationShort } from './mediaMeta';
import { MobileMediaPicker } from './MobileMediaPicker';

export const MobileHome: React.FC<{ onReady: (p: Project) => void }> = ({ onReady }) => {
  const [saved, setSaved] = useState<ProjectSummary[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState('');

  // Estado das chaves (Groq grátis + OpenAI opcional)
  const [hasGroq, setHasGroq] = useState(Boolean(getGroqKey()));
  const [groqInput, setGroqInput] = useState('');
  const [hasOpenAi, setHasOpenAi] = useState(Boolean(getKey()));
  const [openAiInput, setOpenAiInput] = useState('');
  const [keyErr, setKeyErr] = useState('');

  const refreshSaved = () =>
    platform
      .listProjects()
      .then(setSaved)
      .catch(() => undefined);

  useEffect(() => {
    refreshSaved();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget || !platform.deleteProject) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await platform.deleteProject(id).catch((e) => setError((e as Error).message));
    refreshSaved();
  };

  const saveGroq = () => {
    if (!isGroqKey(groqInput)) {
      setKeyErr('A chave do Groq começa com gsk_ (copie inteira).');
      return;
    }
    setGroqKey(groqInput);
    setGroqInput('');
    setKeyErr('');
    setHasGroq(true);
  };

  const saveOpenAi = () => {
    if (!isPlausibleKey(openAiInput)) {
      setKeyErr('A chave da OpenAI começa com sk-');
      return;
    }
    setKey(openAiInput);
    setOpenAiInput('');
    setKeyErr('');
    setHasOpenAi(true);
  };

  return (
    <div
      className="mobile-root flex flex-col"
      style={{
        minHeight: '100dvh',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Topo da Home CapCut */}
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(0, 212, 235, 0.14)',
              border: '1px solid rgba(0, 212, 235, 0.35)',
              color: 'var(--mob-cyan)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <Clapperboard size={20} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--mob-font-display)' }}>
              Editor de Legendas
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--mob-text-muted)' }}>Estúdio Mobile • Reels &amp; TikTok</p>
          </div>
        </div>
        <button
          type="button"
          className="icon"
          onClick={() => {
            setKeyErr('');
            setKeysOpen(true);
          }}
          title="Chaves de transcrição (Groq / OpenAI)"
          aria-label="Chaves de transcrição"
        >
          <KeyRound size={18} aria-hidden="true" />
        </button>
      </header>

      {/* Card principal: Novo projeto (estilo CapCut) */}
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            width: '100%',
            minHeight: 116,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #00D4EB 0%, #0095FF 100%)',
            color: '#041B1E',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 10px 28px rgba(0, 212, 235, 0.25)',
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#041B1E',
              color: '#00D4EB',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <Plus size={24} strokeWidth={2.6} />
          </span>
          <strong style={{ fontSize: 17, fontFamily: 'var(--mob-font-display)', fontWeight: 700 }}>Novo projeto</strong>
        </button>
      </div>

      {error && (
        <div className="error px-4 pt-2" role="alert">
          {error}
        </div>
      )}

      {/* Lista de projetos salvos com miniatura, duração e data */}
      <section className="flex-1 px-4 pt-6" aria-label="Projetos salvos">
        <div className="mb-3 flex items-center justify-between">
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'var(--mob-font-display)' }}>
            Projetos ({saved.length})
          </h2>
        </div>

        {saved.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-8 text-center"
            style={{ background: 'var(--mob-surface)', border: '1px solid var(--mob-border)' }}
          >
            <Film size={28} style={{ color: 'var(--mob-text-muted)' }} aria-hidden="true" />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--mob-text-muted)' }}>
              Nenhum projeto salvo ainda. Toque em <strong>Novo projeto</strong> para começar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {saved.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl p-2"
                style={{ background: 'var(--mob-surface)', border: '1px solid var(--mob-border)' }}
              >
                <button
                  type="button"
                  onClick={() => platform.loadProject(s.id).then(onReady).catch((e) => setError((e as Error).message))}
                  className="flex flex-1 items-center gap-3 text-left"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 4,
                    minHeight: 56,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 60,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: 'var(--mob-card)',
                      border: '1px solid var(--mob-border)',
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.thumb ? (
                      <img src={s.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Film size={18} style={{ color: 'var(--mob-text-muted)' }} aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <strong
                      style={{
                        fontSize: 14,
                        color: 'var(--mob-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.name}
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--mob-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {s.durationMs ? formatDurationShort(s.durationMs) : 'Vídeo'}
                      {s.updatedAt ? ` • ${formatDateShort(s.updatedAt)}` : ''}
                    </span>
                  </div>
                </button>
                {platform.deleteProject && (
                  <button
                    type="button"
                    className="icon"
                    style={{ color: 'var(--mob-text-muted)' }}
                    title="Apagar projeto"
                    aria-label={`Apagar ${s.name}`}
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Seletor de mídia em tela cheia */}
      <MobileMediaPicker
        open={pickerOpen}
        saved={saved}
        onClose={() => setPickerOpen(false)}
        onSelectProject={(p) => {
          setPickerOpen(false);
          onReady(p);
        }}
      />

      {/* Folha de confirmação para apagar projeto (substitui window.confirm no mobile) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)' }}
          onPointerDown={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar exclusão"
        >
          <div
            className="flex w-full max-w-md flex-col gap-3 p-5"
            style={{
              background: 'var(--mob-elevated)',
              borderTop: '1px solid var(--mob-border-strong)',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            }}
          >
            <strong style={{ fontSize: 16, fontFamily: 'var(--mob-font-display)' }}>
              Apagar &ldquo;{deleteTarget.name}&rdquo;?
            </strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--mob-text-muted)' }}>
              O projeto e o vídeo dele serão removidos deste aparelho (se não estiverem em uso por outro projeto).
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" className="flex-1 justify-center" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="danger flex-1 justify-center" onClick={confirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folha de chaves de transcrição (Groq / OpenAI) */}
      {keysOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)' }}
          onPointerDown={(e) => e.target === e.currentTarget && setKeysOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Chaves de transcrição"
        >
          <div
            className="flex w-full max-w-md flex-col gap-3 p-5"
            style={{
              background: 'var(--mob-elevated)',
              borderTop: '1px solid var(--mob-border-strong)',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex items-center justify-between">
              <strong style={{ fontSize: 16, fontFamily: 'var(--mob-font-display)' }}>Chaves de Transcrição</strong>
              <button type="button" className="icon" onClick={() => setKeysOpen(false)} aria-label="Fechar">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: 'var(--mob-card)' }}>
              <strong style={{ fontSize: 13 }}>Nuvem grátis (Groq Whisper)</strong>
              {hasGroq ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="ok small">Chave Groq ativa neste aparelho.</span>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setGroqKey(null);
                      setHasGroq(false);
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: 'var(--mob-text-muted)' }}>
                    Crie grátis em{' '}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--mob-cyan)' }}
                    >
                      console.groq.com/keys
                    </a>{' '}
                    e cole abaixo (uma vez só):
                  </span>
                  <div className="flex gap-2">
                    <input
                      className="text flex-1"
                      type="password"
                      autoComplete="off"
                      placeholder="gsk_…"
                      aria-label="Chave grátis do Groq"
                      value={groqInput}
                      onChange={(e) => setGroqInput(e.target.value)}
                    />
                    <button type="button" className="mob-btn-cyan" onClick={saveGroq}>
                      Salvar
                    </button>
                  </div>
                </>
              )}
            </div>

            {platform.kind === 'device' && (
              <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: 'var(--mob-card)' }}>
                <strong style={{ fontSize: 13 }}>Chave OpenAI (opcional)</strong>
                {hasOpenAi ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="ok small">Chave OpenAI salva neste aparelho.</span>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        setKey(null);
                        setHasOpenAi(false);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="text flex-1"
                      type="password"
                      autoComplete="off"
                      placeholder="sk-…"
                      aria-label="Chave da OpenAI"
                      value={openAiInput}
                      onChange={(e) => setOpenAiInput(e.target.value)}
                    />
                    <button type="button" onClick={saveOpenAi}>
                      Salvar
                    </button>
                  </div>
                )}
              </div>
            )}

            {keyErr && <div className="error">{keyErr}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
