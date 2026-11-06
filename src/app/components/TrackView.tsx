import React, { useEffect, useRef } from 'react';
import { type Anchor3D, type Track3D, anchorHomography, projectCloud } from '../../tracking3d/model';

type Props = {
  src: string;
  track: Track3D;
  tMs: number;
  compW: number;
  compH: number;
  anchor?: Anchor3D;
  /** toque na cena: posição normalizada 0..1 */
  onPick: (x: number, y: number) => void;
};

const depthColor = (d: number) => `hsl(${Math.round(10 + d * 200)} 95% 58%)`; // perto: laranja → longe: azul

/** Visor do rastreio: quadro atual + pontos 3D projetados (cor = profundidade) + grade da superfície grudada. */
export const TrackView: React.FC<Props> = ({ src, track, tMs, compW, compH, anchor, onPick }) => {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const c = canvas.current;
    const v = video.current;
    if (!c || !v) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (v.readyState >= 2) ctx.drawImage(v, 0, 0, c.width, c.height);
    else {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    const sx = c.width / track.width;
    const sy = c.height / track.height;
    for (const p of projectCloud(track, tMs)) {
      ctx.fillStyle = depthColor(p.d);
      ctx.beginPath();
      ctx.arc(p.u * sx, p.v * sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (anchor) {
      const H = anchorHomography(track, anchor, tMs, compW, compH);
      if (H) {
        const k = c.width / compW;
        const map = (a: number, b: number): [number, number] | null => {
          const w = H[6] * a + H[7] * b + H[8];
          return w > 1e-6 ? [((H[0] * a + H[1] * b + H[2]) / w) * k, ((H[3] * a + H[4] * b + H[5]) / w) * k] : null;
        };
        const S = compW * 0.25;
        ctx.strokeStyle = 'rgba(80,255,160,0.9)';
        ctx.lineWidth = 1;
        for (let i = -4; i <= 4; i++) {
          const g = (i / 4) * S;
          for (const [a0, b0, a1, b1] of [[g, -S, g, S], [-S, g, S, g]]) {
            const p0 = map(a0, b0);
            const p1 = map(a1, b1);
            if (!p0 || !p1) continue;
            ctx.beginPath();
            ctx.moveTo(...p0);
            ctx.lineTo(...p1);
            ctx.stroke();
          }
        }
        const o = map(0, 0);
        if (o) {
          ctx.fillStyle = '#50ffa0';
          ctx.beginPath();
          ctx.arc(o[0], o[1], 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const t = tMs / 1000;
    if (Math.abs(v.currentTime - t) > 0.02) v.currentTime = t;
    else draw();
  });

  const w = 320;
  const h = Math.round((w * compH) / compW);
  return (
    <div data-testid="camera3d-view" style={{ position: 'relative' }}>
      <video ref={video} src={src} muted playsInline preload="auto" onSeeked={draw} onLoadedData={draw} style={{ display: 'none' }} />
      <canvas
        ref={canvas}
        width={w}
        height={h}
        style={{ width: '100%', maxWidth: w, borderRadius: 8, cursor: 'crosshair', touchAction: 'manipulation' }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onPick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        }}
      />
      <p className="muted small">Toque num ponto da cena para grudar a frase ali. Cor = profundidade (laranja perto, azul longe).</p>
    </div>
  );
};
