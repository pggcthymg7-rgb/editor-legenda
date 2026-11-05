// Contrato entre a interface e onde as coisas rodam.
// mac: servidor local (upload, OpenAI com chave no .env, render com Remotion no Node).
// device: tudo no aparelho (PWA no iPhone): IndexedDB, OpenAI com chave do usuário, render no navegador.
import type { Project, TranscribedWord } from '../../core/types';

export type FormatId = 'mov-alpha' | 'webm-alpha' | 'mp4-green' | 'mp4-final';

export type FormatInfo = { id: FormatId; label: string; hint: string; ext: string };

export const ALL_FORMATS: FormatInfo[] = [
  { id: 'mov-alpha', label: 'MOV transparente', hint: 'Premiere e CapCut desktop: arraste como camada acima do vídeo.', ext: 'mov' },
  { id: 'mp4-green', label: 'MP4 fundo verde', hint: 'CapCut celular: sobreposição → Chroma key no verde.', ext: 'mp4' },
  { id: 'webm-alpha', label: 'WebM transparente', hint: 'Alternativa transparente leve (navegador, alguns editores).', ext: 'webm' },
  { id: 'mp4-final', label: 'MP4 final', hint: 'Vídeo pronto com legenda gravada, para postar.', ext: 'mp4' },
];

export type SavedVideo = {
  /** vai para project.video.src */
  src: string;
  /** referência para transcrever pela OpenAI */
  ref: string;
};

export type RenderResult = {
  /** link para baixar (servidor) ou blob URL (aparelho) */
  url: string;
  /** só no aparelho: arquivo pronto para o menu Compartilhar do iOS */
  file?: File;
};

export type ProjectSummary = { id: string; name: string };

export interface Platform {
  kind: 'mac' | 'device';
  /** OpenAI disponível? (mac: chave no .env; device: chave salva no aparelho) */
  openAiReady(): Promise<boolean>;
  saveVideo(file: File, onProgress: (p: number) => void): Promise<SavedVideo>;
  /** Converte project.video.src em URL tocável (device: blob URL). */
  videoUrl(src: string): Promise<string>;
  transcribeOpenAi(ref: string, onStatus: (msg: string, p?: number) => void): Promise<TranscribedWord[]>;
  /** Nuvem grátis (proxy → Groq): extrai o áudio aqui e manda só o áudio. */
  transcribeCloud(ref: string, onStatus: (msg: string, p?: number) => void): Promise<TranscribedWord[]>;
  listProjects(): Promise<ProjectSummary[]>;
  loadProject(id: string): Promise<Project>;
  saveProject(p: Project): Promise<void>;
  deleteProject?(id: string): Promise<void>;
  /** Guarda as máscaras da pessoa (uma imagem por quadro). */
  saveMasks(src: string, frames: Blob[], onProgress: (p: number) => void): Promise<void>;
  /** URLs das máscaras na ordem dos quadros. */
  maskUrls(src: string, count: number): Promise<string[]>;
  /** Formatos que este aparelho consegue gerar. */
  formats(width: number, height: number): Promise<FormatInfo[]>;
  /** `project` já com src tocável. */
  render(
    project: Project,
    format: FormatId,
    onProgress: (p: number) => void,
    signal?: AbortSignal,
    opts?: { layer?: 'captions' | 'person'; maskUrls?: string[] },
  ): Promise<RenderResult>;
}

/** iPhone/iPad (iPadOS se apresenta como Mac com toque). */
export const isIOS = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
