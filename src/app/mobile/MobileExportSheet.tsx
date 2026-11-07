import {
  Check,
  Download,
  FileText,
  Film,
  Loader2,
  Share2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toAss, toSrt } from '../../core/exporters';
import type { Project } from '../../core/types';
import { timecodeShort } from '../components/Preview';
import { platform, type FormatId, type FormatInfo } from '../platform';
import { safeName } from '../platform/device';
import { MobileBottomSheet } from './MobileBottomSheet';

function saveTextFile(name: string, text: string) {
  const file = new File([text], name, { type: 'text/plain;charset=utf-8' });
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

async function keepScreenAwake(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    return () => void lock?.release().catch(() => undefined);
  } catch {
    return () => undefined;
  }
}

export type ExportJob = {
  id: string;
  layer: 'captions' | 'person';
  format: FormatId;
  progress: number;
  status: 'rendering' | 'done' | 'error';
  url?: string;
  file?: File;
  error?: string;
};

export type MobileExportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  maskUrls?: string[];
  personMasks?: string[];
  onRenderingStateChange?: (rendering: boolean, progress: number) => void;
};

export const MobileExportSheet: React.FC<MobileExportSheetProps> = ({
  open,
  onOpenChange,
  project,
  maskUrls,
  personMasks,
  onRenderingStateChange,
}) => {
  const [layer, setLayer] = useState<'captions' | 'person'>('captions');
  const [formats, setFormats] = useState<FormatInfo[] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('mp4-final');
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const aborts = useRef(new Map<string, AbortController>());
  const urls = useRef<string[]>([]);

  const canPerson = Boolean(project.video.mask);
  const base = safeName(project.name);
  const { width, height, durationMs } = project.video;

  const activeJob = jobs.find((j) => j.status === 'rendering') ?? null;
  const busy = Boolean(activeJob);

  useEffect(() => {
    onRenderingStateChange?.(busy, activeJob?.progress ?? 0);
  }, [busy, activeJob?.progress, onRenderingStateChange]);

  useEffect(() => {
    let alive = true;
    platform
      .formats(width, height)
      .then((list) => {
        if (!alive) return;
        setFormats(list);
        if (list.length > 0 && !list.some((f) => f.id === selectedFormat)) {
          setSelectedFormat(list[0].id);
        }
      })
      .catch(() => {
        if (alive) setFormats([]);
      });
    return () => {
      alive = false;
    };
  }, [width, height]);

  useEffect(
    () => () => {
      urls.current.forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u));
    },
    [],
  );

  const availableFormats = (formats ?? []).filter(
    (f) => layer === 'captions' || f.id !== 'mp4-final',
  );

  useEffect(() => {
    if (
      availableFormats.length > 0 &&
      !availableFormats.some((f) => f.id === selectedFormat)
    ) {
      setSelectedFormat(availableFormats[0].id);
    }
  }, [layer, availableFormats, selectedFormat]);

  const updateJob = (id: string, patch: Partial<ExportJob>) =>
    setJobs((js) => js.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const startRender = async (format: FormatId) => {
    const id = Math.random().toString(36).slice(2);
    const ctrl = new AbortController();
    aborts.current.set(id, ctrl);
    setJobs((j) => [{ id, layer, format, progress: 0, status: 'rendering' }, ...j]);
    const release = await keepScreenAwake();
    try {
      const r = await platform.render(
        project,
        format,
        (p) => updateJob(id, { progress: p }),
        ctrl.signal,
        {
          layer,
          maskUrls:
            layer === 'person'
              ? (personMasks ??
                maskUrls ??
                (await platform.maskUrls(project.video.src, project.video.mask!.count)))
              : maskUrls,
        },
      );
      urls.current.push(r.url);
      updateJob(id, { status: 'done', url: r.url, file: r.file, progress: 1 });
    } catch (e) {
      updateJob(id, {
        status: 'error',
        error: ctrl.signal.aborted ? 'Exportação cancelada.' : (e as Error).message,
      });
    } finally {
      release();
      aborts.current.delete(id);
    }
  };

  const canShareFile = (file?: File) =>
    Boolean(file && navigator.canShare?.({ files: [file] }));

  return (
    <MobileBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Qualidade e Exportação"
      maxHeight="76dvh"
    >
      <div className="flex flex-col gap-3.5">
        {/* Resumo real da composição (estilo CapCut Print 6) */}
        <div className="rounded-xl bg-[#1E212B] border border-white/[0.08] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#00D4EB]/15 text-[#00D4EB] flex items-center justify-center">
              <Film size={18} aria-hidden="true" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">
                {width} × {height} px · 30 fps
              </div>
              <div className="text-[11px] text-[#9CA3AF]">
                Duração: {timecodeShort(durationMs)} · {project.phrases.length} legenda(s)
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-[#00D4EB]">
            Original
          </span>
        </div>

        {/* Camada a exportar */}
        <div className="rounded-xl bg-[#1E212B] border border-white/[0.08] p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white/90">Camada de vídeo</span>
            <div className="flex rounded-lg bg-[#0B0C10] p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setLayer('captions')}
                className={`px-3 py-1 min-h-[32px] min-w-0 rounded-md text-xs font-semibold ${
                  layer === 'captions'
                    ? 'bg-[#00D4EB] text-[#041B1E]'
                    : 'text-[#9CA3AF]'
                }`}
              >
                Legendas
              </button>
              <button
                type="button"
                disabled={!canPerson}
                onClick={() => setLayer('person')}
                title={canPerson ? '' : 'Analise a pessoa primeiro'}
                className={`px-3 py-1 min-h-[32px] min-w-0 rounded-md text-xs font-semibold disabled:opacity-40 ${
                  layer === 'person'
                    ? 'bg-[#00D4EB] text-[#041B1E]'
                    : 'text-[#9CA3AF]'
                }`}
              >
                Pessoa (frente)
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#9CA3AF]">
            {layer === 'captions'
              ? 'Vídeo final com as legendas animadas (frases marcadas "atrás da pessoa" já saem recortadas).'
              : 'Camada somente com a pessoa recortada em fundo transparente para empilhar em outro editor.'}
          </p>
        </div>

        {/* Formatos reais suportados pelo aparelho */}
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#9CA3AF]">
            Formato do arquivo
          </span>
          {formats === null && (
            <div className="text-xs text-[#9CA3AF] py-2">Verificando codificadores do aparelho…</div>
          )}
          {availableFormats.map((f) => {
            const isSel = f.id === selectedFormat;
            return (
              <button
                key={f.id}
                type="button"
                disabled={busy}
                onClick={() => setSelectedFormat(f.id)}
                className={`w-full rounded-xl p-3 text-left flex items-center justify-between transition-all ${
                  isSel
                    ? 'bg-[#1E212B] ring-2 ring-[#00D4EB]'
                    : 'bg-[#1E212B]/70 border border-white/10'
                }`}
              >
                <div className="pr-2">
                  <div className="text-[13px] font-bold text-white">{f.label}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{f.hint}</div>
                </div>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    isSel
                      ? 'bg-[#00D4EB] border-[#00D4EB] text-[#041B1E]'
                      : 'border-white/25'
                  }`}
                >
                  {isSel && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* CTA Principal Estilo CapCut Print 7: "Salvar no dispositivo" */}
        {availableFormats.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => startRender(selectedFormat)}
            className="mob-btn-cyan w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span>
                  Exportando ({Math.round((activeJob?.progress ?? 0) * 100)}%)…
                </span>
              </>
            ) : (
              <>
                <Sparkles size={17} aria-hidden="true" />
                <span>Salvar no dispositivo</span>
              </>
            )}
          </button>
        )}

        {/* Exportação rápida de arquivos de legenda (SRT / ASS) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => saveTextFile(`${base}.srt`, toSrt(project))}
            className="flex-1 h-10 rounded-xl bg-[#1E212B] border border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/90"
          >
            <FileText size={14} aria-hidden="true" />
            <span>Baixar .SRT</span>
          </button>
          <button
            type="button"
            onClick={() => saveTextFile(`${base}.ass`, toAss(project))}
            className="flex-1 h-10 rounded-xl bg-[#1E212B] border border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/90"
          >
            <FileText size={14} aria-hidden="true" />
            <span>Baixar .ASS</span>
          </button>
        </div>

        {/* Lista de trabalhos em andamento ou concluídos */}
        {jobs.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            {jobs.map((j) => {
              const label =
                formats?.find((f) => f.id === j.format)?.label ?? j.format;
              return (
                <div
                  key={j.id}
                  className="rounded-xl bg-[#0B0C10] border border-white/12 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-white">
                      {j.layer === 'person' ? 'Pessoa · ' : ''}
                      {label}
                    </strong>
                    {j.status === 'rendering' && (
                      <span className="text-[#00D4EB] font-mono">
                        {Math.round(j.progress * 100)}%
                      </span>
                    )}
                  </div>

                  {j.status === 'rendering' && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#00D4EB] transition-all"
                          style={{ width: `${Math.round(j.progress * 100)}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => aborts.current.get(j.id)?.abort()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[34px] min-w-0 rounded-lg bg-white/10 text-xs text-white"
                      >
                        <XCircle size={14} aria-hidden="true" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  )}

                  {j.status === 'done' && (
                    <div className="flex items-center gap-2 pt-0.5">
                      {canShareFile(j.file) && (
                        <button
                          type="button"
                          onClick={() =>
                            j.file &&
                            navigator.share({ files: [j.file] }).catch(() => undefined)
                          }
                          className="mob-btn-cyan flex-1 h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Share2 size={14} aria-hidden="true" />
                          <span>Compartilhar / Salvar Vídeo</span>
                        </button>
                      )}
                      <a
                        href={j.url}
                        download={j.file?.name ?? `${base}-${j.format}`}
                        className="flex-1 h-10 rounded-lg bg-[#1E212B] border border-white/15 text-xs font-semibold text-white flex items-center justify-center gap-1.5 no-underline"
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Baixar arquivo</span>
                      </a>
                    </div>
                  )}

                  {j.status === 'error' && (
                    <p className="text-xs text-[#EF4444]" role="alert">
                      {j.error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};
