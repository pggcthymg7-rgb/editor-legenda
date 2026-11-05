// Forma de onda do áudio (picos) para a timeline. Decodifica no navegador (Mac e iPhone).
// Caminho principal: mediabunny em pedaços (WebCodecs) — nunca carrega o vídeo inteiro na RAM.
// Reserva: decodeAudioData só para arquivos pequenos, com o AudioContext sempre fechado.
import { ALL_FORMATS, AudioSampleSink, Input, UrlSource } from 'mediabunny';

const MAX_CACHE = 6;
const FALLBACK_MAX_BYTES = 64 * 1024 * 1024;
const cache = new Map<string, Promise<Float32Array | null>>();

export function loadPeaks(url: string, buckets = 3000): Promise<Float32Array | null> {
  const key = `${url}|${buckets}`;
  const hit = cache.get(key);
  if (hit) {
    // LRU: reinsere como mais recente
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const p = (async () => (await streamPeaks(url, buckets).catch(() => null)) ?? (await decodePeaks(url, buckets).catch(() => null)))();
  cache.set(key, p);
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return p;
}

async function streamPeaks(url: string, buckets: number): Promise<Float32Array | null> {
  const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return null;
    const durationS = await input.computeDuration();
    if (!(durationS > 0)) return null;
    const out = new Float32Array(buckets);
    let buf = new Float32Array(0);
    for await (const s of new AudioSampleSink(track).samples()) {
      try {
        const n = s.numberOfFrames;
        if (buf.length < n) buf = new Float32Array(n);
        s.copyTo(buf, { planeIndex: 0, format: 'f32-planar' });
        accumulatePeaks(out, buf.subarray(0, n), s.timestamp, s.sampleRate, durationS);
      } finally {
        s.close();
      }
    }
    return normalizePeaks(out);
  } finally {
    input.dispose();
  }
}

async function decodePeaks(url: string, buckets: number): Promise<Float32Array | null> {
  const res = await fetch(url);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (!len || len > FALLBACK_MAX_BYTES) return null; // tamanho desconhecido ou grande: não arrisca a RAM
  const buf = await res.arrayBuffer();
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(buf);
    return computePeaks(audio.getChannelData(0), buckets);
  } finally {
    void ctx.close();
  }
}

/** Soma um pedaço de áudio (começando em startS) ao pico de cada balde. */
export function accumulatePeaks(out: Float32Array, data: Float32Array, startS: number, sampleRate: number, durationS: number): void {
  const k = out.length / (durationS * sampleRate);
  const base = startS * sampleRate;
  const last = out.length - 1;
  for (let i = 0; i < data.length; i++) {
    const b = Math.floor((base + i) * k);
    if (b < 0) continue;
    const idx = b > last ? last : b;
    const v = Math.abs(data[i]);
    if (v > out[idx]) out[idx] = v;
  }
}

/** Normaliza 0–1 (no lugar). */
export function normalizePeaks(out: Float32Array): Float32Array {
  let max = 0;
  for (let b = 0; b < out.length; b++) if (out[b] > max) max = out[b];
  if (max > 0) for (let b = 0; b < out.length; b++) out[b] /= max;
  return out;
}

/** Pico absoluto por balde, normalizado 0–1. */
export function computePeaks(data: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  const step = Math.max(1, Math.floor(data.length / buckets));
  for (let b = 0; b < buckets; b++) {
    let m = 0;
    const end = Math.min(data.length, (b + 1) * step);
    for (let i = b * step; i < end; i++) {
      const v = Math.abs(data[i]);
      if (v > m) m = v;
    }
    out[b] = m;
  }
  return normalizePeaks(out);
}
