import { describe, expect, it } from 'vitest';
import { fillHoles, grayToAlpha, maskFrameCount, maskIndexAt, refineMask, removeSmallIslands } from '../src/core/mask';

describe('máscara de pessoa', () => {
  it('conta quadros e acha o índice pelo tempo', () => {
    expect(maskFrameCount(4000)).toBe(120);
    expect(maskIndexAt(0, 120)).toBe(0);
    expect(maskIndexAt(1000, 120)).toBe(30);
    expect(maskIndexAt(99999, 120)).toBe(119);
  });
  it('refina com suavização no tempo e borda', () => {
    const out = new Uint8ClampedArray(3);
    const cur = refineMask(new Float32Array([0, 0.4, 1]), null, out);
    expect([...out]).toEqual([0, 128, 255]);
    const out2 = new Uint8ClampedArray(3);
    refineMask(new Float32Array([0.8, 1, 1]), cur, out2, 0.5);
    expect(out2[0]).toBe(128); // metade do caminho (0,4)
  });
  it('alfa: buraco na pessoa ou só a pessoa', () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const hole = px.slice();
    grayToAlpha(hole, 'hole');
    expect([hole[3], hole[7]]).toEqual([0, 255]);
    const person = px.slice();
    grayToAlpha(person, 'person');
    expect([person[3], person[7]]).toEqual([255, 0]);
  });
  it('preenche buraco dentro da pessoa, mas não o fundo da borda', () => {
    const w = 10, h = 10;
    const g = new Uint8ClampedArray(w * h);
    for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) g[y * w + x] = 255;
    g[5 * w + 5] = 0; // buraco interno
    fillHoles(g, w, h);
    expect(g[5 * w + 5]).toBe(255);
    expect(g[0]).toBe(0);
  });
  it('remove manchas pequenas e mantém a pessoa', () => {
    const w = 20, h = 20;
    const g = new Uint8ClampedArray(w * h);
    for (let y = 5; y < 18; y++) for (let x = 5; x < 12; x++) g[y * w + x] = 255; // pessoa
    g[1 * w + 18] = 255; // mancha de 1 px
    removeSmallIslands(g, w, h, 0.01);
    expect(g[1 * w + 18]).toBe(0);
    expect(g[10 * w + 8]).toBe(255);
  });
});
