// Leitura de metadados (largura, altura, duração) e geração de miniatura leve para o MobileHome/MediaPicker.

export async function readVideoMeta(file: File): Promise<{ width: number; height: number; durationMs: number; thumb?: string }> {
  const native = await new Promise<{ width: number; height: number; durationMs: number; thumb?: string } | null>((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (res: { width: number; height: number; durationMs: number; thumb?: string } | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(res);
    };
    const timer = setTimeout(() => done(null), 5000);
    v.onloadedmetadata = () => {
      const width = v.videoWidth;
      const height = v.videoHeight;
      const durationMs = Math.round(v.duration * 1000);
      if (width >= 16 && height >= 16 && Number.isFinite(durationMs) && durationMs > 0) {
        v.onseeked = () => {
          clearTimeout(timer);
          let thumb: string | undefined;
          try {
            const maxDim = 160;
            const scale = Math.min(1, maxDim / Math.max(width, height));
            const cw = Math.max(16, Math.round(width * scale));
            const ch = Math.max(16, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(v, 0, 0, cw, ch);
              thumb = canvas.toDataURL('image/jpeg', 0.65);
            }
          } catch {
            // Ambiente de teste ou vídeo protegido: segue sem miniatura
          }
          done({ width, height, durationMs, thumb });
        };
        try {
          v.currentTime = Math.min(0.4, (v.duration || 1) * 0.2);
        } catch {
          clearTimeout(timer);
          done({ width, height, durationMs });
        }
      } else {
        clearTimeout(timer);
        done(null);
      }
    };
    v.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    v.src = url;
  });

  if (native) return native;

  const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny');
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const [vt, dur] = await Promise.all([input.getPrimaryVideoTrack(), input.computeDuration()]);
    const width = Math.round(vt?.displayWidth || vt?.codedWidth || 0);
    const height = Math.round(vt?.displayHeight || vt?.codedHeight || 0);
    const durationMs = Math.round((dur || 0) * 1000);
    if (width < 16 || height < 16 || durationMs < 1) throw new Error('Não consegui ler o vídeo');
    return { width, height, durationMs };
  } finally {
    input.dispose();
  }
}

export function formatDurationShort(ms?: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatDateShort(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  } catch {
    return '';
  }
}
