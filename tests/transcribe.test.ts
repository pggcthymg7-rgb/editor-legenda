import { describe, expect, it } from 'vitest';
import { chunksToWords, isSafariLike, MODEL_IDS, WASM_DTYPE } from '../src/app/transcribe';

describe('transcrição no aparelho', () => {
  it('iPhone e Safari usam CPU; Chrome não', () => {
    expect(isSafariLike('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1')).toBe(true);
    expect(isSafariLike('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140 Mobile Safari/604.1')).toBe(true);
    expect(isSafariLike('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15')).toBe(true);
    expect(isSafariLike('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36')).toBe(false);
  });
  it('converte chunks por palavra em ms e junta pontuação', () => {
    const w = chunksToWords(
      [
        { text: ' Olá', timestamp: [0, 0.4] },
        { text: ',', timestamp: [0.4, 0.42] },
        { text: ' mundo', timestamp: [0.5, null] },
        { text: '  ', timestamp: [1, 1.1] },
      ],
      2,
    );
    expect(w.map((x) => x.text)).toEqual(['Olá,', 'mundo']);
    expect(w[1]).toMatchObject({ startMs: 500, endMs: 900 });
  });
  it('modelos com tempo por palavra e dtype seguro na CPU', () => {
    expect(MODEL_IDS.base).toMatch(/_timestamped$/);
    expect(WASM_DTYPE.decoder_model_merged).toBe('q4');
  });
});
