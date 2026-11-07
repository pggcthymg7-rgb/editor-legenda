import { Check, Film, FolderPlus, Loader2, X } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { createProject } from '../../core/grouping';
import type { Project } from '../../core/types';
import { platform, type ProjectSummary } from '../platform';
import { formatDurationShort, readVideoMeta } from './mediaMeta';

export const MobileMediaPicker: React.FC<{
  open: boolean;
  saved: ProjectSummary[];
  onClose: () => void;
  onSelectProject: (p: Project) => void;
}> = ({ open, saved, onClose, onSelectProject }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  // Vídeos únicos já importados em projetos salvos (com duração e dimensão conhecidas)
  const reusableMedia = useMemo(() => {
    const seen = new Set<string>();
    const list: ProjectSummary[] = [];
    for (const s of saved) {
      if (!s.videoSrc || seen.has(s.videoSrc)) continue;
      if (!s.width || !s.height || !s.durationMs) continue;
      seen.add(s.videoSrc);
      list.push(s);
    }
    return list;
  }, [saved]);

  if (!open) return null;

  const handleNativeFile = async (file: File | null) => {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      setStatusMsg('Lendo vídeo…');
      const meta = await readVideoMeta(file);
      setStatusMsg('Importando mídia…');
      const up = await platform.saveVideo(file, () => undefined);
      if (meta.thumb && platform.saveThumb) {
        await platform.saveThumb(up.src, meta.thumb).catch(() => undefined);
      }
      const cleanName = file.name.replace(/\.[^.]+$/, '') || 'Projeto';
      const project = createProject(
        { src: up.src, width: meta.width, height: meta.height, durationMs: meta.durationMs, fps: 30 },
        [],
        cleanName,
      );
      await platform.saveProject(project).catch(() => undefined);
      onSelectProject(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatusMsg('');
    }
  };

  const handleAddExisting = async () => {
    const item = reusableMedia.find((m) => m.videoSrc === selectedSrc);
    if (!item || !item.videoSrc || !item.width || !item.height || !item.durationMs || busy) return;
    setBusy(true);
    setError('');
    try {
      const project = createProject(
        { src: item.videoSrc, width: item.width, height: item.height, durationMs: item.durationMs, fps: 30 },
        [],
        item.name || 'Projeto',
      );
      await platform.saveProject(project).catch(() => undefined);
      onSelectProject(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'var(--mob-bg)',
        color: 'var(--mob-text)',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar mídia"
    >
      <header
        className="flex items-center justify-between px-4 pb-3"
        style={{ borderBottom: '1px solid var(--mob-border)' }}
      >
        <button
          type="button"
          className="icon"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar seletor de mídia"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center">
          <strong style={{ fontSize: 15, fontFamily: 'var(--mob-font-display)' }}>Vídeos</strong>
          <span style={{ fontSize: 11, color: 'var(--mob-text-muted)' }}>Escolha 1 vídeo para editar</span>
        </div>
        <div style={{ width: 44 }} />
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.m4v,.mov"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = '';
          void handleNativeFile(f);
        }}
      />

      <div className="flex-1 overflow-y-auto p-3">
        {error && (
          <div className="error mb-3 px-2" role="alert">
            {error}
          </div>
        )}

        {busy && (
          <div
            className="mb-3 flex items-center justify-center gap-2 rounded-xl p-3"
            style={{ background: 'var(--mob-card)', border: '1px solid var(--mob-border)' }}
          >
            <Loader2 size={18} className="spin" aria-hidden="true" />
            <span style={{ fontSize: 13 }}>{statusMsg || 'Carregando vídeo…'}</span>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {/* 1º quadrado: Galeria do aparelho (abre o seletor nativo do iOS/macOS) */}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            style={{
              aspectRatio: '1 / 1',
              background: 'var(--mob-card)',
              border: '1.5px dashed var(--mob-cyan)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: 8,
              color: 'var(--mob-cyan)',
            }}
            aria-label="Escolher vídeo da Galeria"
          >
            <FolderPlus size={26} aria-hidden="true" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mob-text)' }}>Galeria</span>
            <span style={{ fontSize: 10, color: 'var(--mob-text-muted)' }}>Rolo da câmera</span>
          </button>

          {/* Quadrados seguintes: vídeos já importados no aparelho */}
          {reusableMedia.map((m) => {
            const isSelected = selectedSrc === m.videoSrc;
            return (
              <button
                key={m.videoSrc}
                type="button"
                disabled={busy}
                onClick={() => setSelectedSrc((cur) => (cur === m.videoSrc ? null : m.videoSrc ?? null))}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  padding: 0,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--mob-card)',
                  border: isSelected ? '2px solid var(--mob-cyan)' : '1px solid var(--mob-border)',
                }}
                aria-label={`Selecionar vídeo ${m.name}`}
                aria-pressed={isSelected}
              >
                {m.thumb ? (
                  <img
                    src={m.thumb}
                    alt={m.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                    <Film size={22} style={{ color: 'var(--mob-text-muted)' }} aria-hidden="true" />
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--mob-text-muted)',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.name}
                    </span>
                  </div>
                )}

                {/* Círculo de seleção única no canto superior direito */}
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--mob-cyan)' : 'rgba(0, 0, 0, 0.55)',
                    border: isSelected ? 'none' : '1.5px solid rgba(255, 255, 255, 0.75)',
                    color: 'var(--mob-cyan-ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </span>

                {/* Duração no canto inferior direito */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(0, 0, 0, 0.72)',
                    color: '#fff',
                    fontSize: 10,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDurationShort(m.durationMs)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé fixo com botão Adicionar (estilo CapCut) */}
      <footer
        className="flex items-center justify-between gap-3 px-4 pt-3"
        style={{ borderTop: '1px solid var(--mob-border)', background: 'var(--mob-surface)' }}
      >
        <span style={{ fontSize: 12, color: 'var(--mob-text-muted)' }}>
          {selectedSrc ? '1 vídeo selecionado' : 'Toque em Galeria ou escolha um vídeo recente'}
        </span>
        <button
          type="button"
          className="mob-btn-cyan"
          disabled={!selectedSrc || busy}
          onClick={handleAddExisting}
          style={{ borderRadius: 999, padding: '10px 22px', fontSize: 14 }}
        >
          Adicionar
        </button>
      </footer>
    </div>
  );
};
