import { describe, expect, it } from 'vitest';
import { _test, toTrack3D } from '../server/track3d';
import { anchorHomography, makeAnchor } from '../src/tracking3d/model';
import { validateProject } from '../src/core/validate';

const cam = '# c\n1 SIMPLE_RADIAL 640 360 500 320 180 0.01\n';
// câmera andando em x olhando para +z; pontos numa parede z=5 e chão y=1
const imgs = Array.from({ length: 10 }, (_, i) => `${i + 1} 1 0 0 0 ${-i * 0.05} 0 0 1 ${String(i + 1).padStart(5, '0')}.jpg\n\n`).join('');
const pts = Array.from({ length: 300 }, (_, i) => {
  const X = i < 150 ? [((i % 15) - 7) * 0.3, (Math.floor(i / 15) - 5) * 0.2, 5] : [((i % 15) - 7) * 0.3, 1, 2 + ((i - 150) / 15) * 0.3];
  return `${i + 1} ${X.join(' ')} 0 0 0 0.4 1 0 2 0 3 0`;
}).join('\n');

describe('motor de precisão (COLMAP)', () => {
  it('converte o modelo em Track3D válido e interpola quadros faltantes', () => {
    const m = _test.parseModel(cam, imgs, pts);
    expect(m.imgs).toHaveLength(10);
    const tr = toTrack3D({ ...m, imgs: m.imgs.filter((x) => x.frame !== 4) }, 10);
    expect(tr.poses).toHaveLength(10);
    expect(tr.poses[4].t[0]).toBeCloseTo(-0.2, 1);
    expect(tr.err).toBeCloseTo(0.4, 2);
    const a = makeAnchor(tr, 0, 320, 180, 640, 360)!;
    expect(a.kind).toBe('parede');
    expect(anchorHomography(tr, a, 200, 640, 360)).not.toBeNull();
    const ok = validateProject({ version: 1, id: 'x', name: 'x', video: { src: '/media/a.mp4', width: 640, height: 360, durationMs: 1000, fps: 24, track3d: tr }, phrases: [] });
    expect(ok.ok || !String((ok as { error: string }).error).includes('rastreio')).toBe(true);
  });
});
