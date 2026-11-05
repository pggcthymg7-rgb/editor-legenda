// Matemática das máscaras de pessoa (pura, testada). Valores 0–1 por pixel.

export const MASK_FPS = 30;
/** largura da máscara salva (altura segue a proporção do vídeo) */
export const MASK_WIDTH = 320;

/** Quantos quadros de máscara um vídeo tem. */
export const maskFrameCount = (durationMs: number, fps = MASK_FPS) => Math.max(1, Math.ceil((durationMs / 1000) * fps));

/** Índice da máscara para um tempo (ms). */
export const maskIndexAt = (ms: number, count: number, fps = MASK_FPS) => Math.min(count - 1, Math.max(0, Math.round((ms / 1000) * fps)));

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Confiança da pessoa → máscara final:
 * - suaviza no tempo com o quadro anterior (tira tremido);
 * - realça a borda (smoothstep) sem serrilhar.
 * `out` recebe 0–255 (cinza: branco = pessoa).
 */
export function refineMask(person: Float32Array, prev: Float32Array | null, out: Uint8ClampedArray, temporal = 0.35, lo = 0.2, hi = 0.6): Float32Array {
  const cur = new Float32Array(person.length);
  for (let i = 0; i < person.length; i++) {
    const v = prev ? person[i] * (1 - temporal) + prev[i] * temporal : person[i];
    cur[i] = v;
    out[i] = Math.round(255 * smoothstep(lo, hi, v));
  }
  return cur;
}

/**
 * Cinza (RGBA, R = pessoa) → alfa da máscara CSS.
 * mode 'hole' = buraco onde está a pessoa (legenda atrás); 'person' = só a pessoa.
 */
export function grayToAlpha(rgba: Uint8ClampedArray, mode: 'hole' | 'person'): void {
  for (let i = 0; i < rgba.length; i += 4) {
    const p = rgba[i];
    rgba[i] = 255;
    rgba[i + 1] = 255;
    rgba[i + 2] = 255;
    rgba[i + 3] = mode === 'hole' ? 255 - p : p;
  }
}

/**
 * Apaga manchas soltas pequenas (texto queimado, reflexos) que não são a pessoa.
 * Componentes conectados (4 vizinhos) com área < minFrac da imagem viram 0.
 */
export function removeSmallIslands(gray: Uint8ClampedArray, w: number, h: number, minFrac = 0.004, thr = 128): void {
  const n = w * h;
  const label = new Int32Array(n);
  const stack = new Int32Array(n);
  const minArea = Math.max(1, Math.round(n * minFrac));
  let next = 1;
  const small: number[] = [];
  for (let i = 0; i < n; i++) {
    if (label[i] || gray[i] < thr) continue;
    const id = next++;
    let top = 0;
    let area = 0;
    stack[top++] = i;
    label[i] = id;
    while (top) {
      const j = stack[--top];
      area++;
      const x = j % w;
      const nb = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w];
      for (const k of nb) {
        if (k >= 0 && k < n && !label[k] && gray[k] >= thr) {
          label[k] = id;
          stack[top++] = k;
        }
      }
    }
    if (area < minArea) small.push(id);
  }
  if (!small.length) return;
  const kill = new Set(small);
  // zera também a borda suave (pixels < thr) colada nas manchas apagadas
  for (let i = 0; i < n; i++) if (kill.has(label[i])) gray[i] = 0;
  for (let i = 0; i < n; i++) {
    if (gray[i] && gray[i] < thr) {
      const x = i % w;
      const near = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w].some((k) => k >= 0 && k < n && kill.has(label[k]));
      if (near) gray[i] = 0;
    }
  }
}

/**
 * Preenche buracos dentro da pessoa (fundo cercado por pessoa, sem tocar a borda da imagem).
 * Ex.: roupa branca sobre piso claro que o modelo marca como fundo.
 */
export function fillHoles(gray: Uint8ClampedArray, w: number, h: number, thr = 128): void {
  const n = w * h;
  const outside = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const push = (k: number) => {
    if (!outside[k] && gray[k] < thr) {
      outside[k] = 1;
      stack[top++] = k;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (top) {
    const j = stack[--top];
    const x = j % w;
    if (x > 0) push(j - 1);
    if (x < w - 1) push(j + 1);
    if (j >= w) push(j - w);
    if (j < n - w) push(j + w);
  }
  for (let i = 0; i < n; i++) if (!outside[i] && gray[i] < thr) gray[i] = 255;
}
