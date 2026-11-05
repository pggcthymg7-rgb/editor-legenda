// Forma de onda do áudio (picos) para a timeline. Decodifica no navegador (Mac e iPhone).
const cache = new Map<string, Promise<Float32Array | null>>();

export function loadPeaks(url: string, buckets = 3000): Promise<Float32Array | null> {
  const key = `${url}|${buckets}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url);
        const len = Number(res.headers.get('content-length') ?? 0);
        if (len > 400 * 1024 * 1024) return null; // arquivo enorme: pula (economiza memória)
        const buf = await res.arrayBuffer();
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf);
        void ctx.close();
        return computePeaks(audio.getChannelData(0), buckets);
      } catch {
        return null; // sem áudio ou formato não suportado
      }
    })();
    cache.set(key, p);
  }
  return p;
}

/** Pico absoluto por balde, normalizado 0–1. */
export function computePeaks(data: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  const step = Math.max(1, Math.floor(data.length / buckets));
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    let m = 0;
    const end = Math.min(data.length, (b + 1) * step);
    for (let i = b * step; i < end; i++) {
      const v = Math.abs(data[i]);
      if (v > m) m = v;
    }
    out[b] = m;
    if (m > max) max = m;
  }
  if (max > 0) for (let b = 0; b < buckets; b++) out[b] /= max;
  return out;
}
