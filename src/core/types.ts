// Modelo de dados do editor. Tudo aqui é JSON puro (serializável),
// para salvar projeto, mandar ao render e validar.

import type { FontKey } from './fonts';
export type { FontKey };

export type Fill =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; colors: string[]; angle: number };

export type TextStyle = {
  fontFamily: FontKey;
  fontWeight: number;
  italic: boolean;
  /** px numa tela de 1080 de largura (escala para a largura real do vídeo) */
  fontSize: number;
  fill: Fill;
  /** em */
  letterSpacing: number;
  uppercase: boolean;
  opacity: number;
  glow: { color: string; blur: number } | null;
  shadow: { color: string; blur: number; x: number; y: number } | null;
  stroke: { color: string; width: number } | null;
  /** caixa atrás da palavra (estilo CapCut/Submagic); medidas em em */
  box?: { color: string; opacity: number; padX: number; padY: number; radius: number } | null;
};

/** Papel da palavra no bloco: ligação pequena, normal ou palavra-chave grande. */
export type Role = 'small' | 'normal' | 'key';

export const ENTRANCES = ['blurUp', 'pop', 'fade', 'slideUp', 'zoomIn', 'none'] as const;
export const EXITS = ['blurOut', 'fade', 'zoomOut', 'none'] as const;
export type Entrance = (typeof ENTRANCES)[number];
export type Exit = (typeof EXITS)[number];

/**
 * word   = palavras aparecem uma a uma e ficam (acumula)
 * phrase = frase inteira entra junta
 * single = só a palavra falada aparece (troca)
 */
export type RevealMode = 'word' | 'phrase' | 'single';

export type Animation = {
  entrance: Entrance;
  exit: Exit;
  durationMs: number;
  staggerMs: number;
  mode: RevealMode;
  /** mantém a frase na tela até a próxima começar (máx. 1,5 s) */
  holdMs: number;
};

/** stack = linhas empilhadas por papel; inline = uma linha que quebra; arc = palavras em arco inclinado */
export type Layout = 'stack' | 'inline' | 'arc';

export type Preset = {
  id: string;
  name: string;
  description: string;
  roles: Record<Role, TextStyle>;
  animation: Animation;
  layout: Layout;
  align: 'left' | 'center' | 'right';
  /** posição padrão do centro do bloco, 0–1 */
  position: { x: number; y: number };
  /** espaço entre linhas, em fração do tamanho da fonte */
  lineGap: number;
  /** números contam de 0 até o valor */
  counter: boolean;
  /** reduz a fonte para a palavra caber em 92% da largura (P5) */
  fitWidth?: boolean;
  /** máximo de palavras por frase no agrupamento automático */
  maxWords: number;
  /** perspectiva 3D padrão das frases novas, graus (P7) */
  rotateX?: number;
  rotateY?: number;
};

export type Word = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  role: Role;
  style?: Partial<TextStyle>;
  dx?: number;
  dy?: number;
  rotation?: number;
  /** escala horizontal/vertical só desta palavra (1 = normal) */
  scaleX?: number;
  scaleY?: number;
};

export type Phrase = {
  id: string;
  words: Word[];
  presetId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** perspectiva 3D, graus */
  rotateX: number;
  rotateY: number;
  align?: 'left' | 'center' | 'right';
  animation?: Partial<Animation>;
  /** sobrescreve estilo do papel para todas as palavras da frase */
  roleStyles?: Partial<Record<Role, Partial<TextStyle>>>;
  /** estilo aplicado à palavra enquanto ela é falada (karaoke) */
  highlight?: Partial<TextStyle> | null;
  /** legenda passa atrás da pessoa (precisa da análise de pessoa no vídeo) */
  behind?: boolean;
};

export type VideoMeta = {
  src: string;
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  /** análise de pessoa feita (máscaras guardadas fora do projeto) */
  mask?: { count: number; fps: number; width: number; height: number };
};

export type Project = {
  version: 1;
  id: string;
  name: string;
  video: VideoMeta;
  phrases: Phrase[];
  customPresets: Preset[];
  /** liga/desliga a legenda atrás da pessoa no projeto todo (padrão: ligado se houver análise) */
  occlusion?: boolean;
};

/** Palavra transcrita, já com tempos em ms (saída de qualquer motor). */
export type TranscribedWord = { text: string; startMs: number; endMs: number };

/** Props da composição Remotion. */
export type CompositionProps = {
  project: Project;
  /** 'video' = mostra o vídeo; senão só legenda sobre a cor/transparente */
  background: 'video' | 'transparent' | 'green';
  /** máscaras da pessoa, uma por quadro (só em tempo de execução, nunca salvas no projeto) */
  maskUrls?: string[];
  /** 'captions' = legenda (padrão); 'person' = só a pessoa recortada (camada da frente) */
  layer?: 'captions' | 'person';
};
