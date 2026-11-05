// Projeto de exemplo: uma frase de cada modelo, para o Studio e testes de render.
import { buildPhrase } from '../core/grouping';
import { PRESETS } from '../core/presets';
import type { Project, TranscribedWord } from '../core/types';

const SAMPLE_TEXTS = [
  'Você já viu uma casa',
  'com ponte no telhado?',
  'isso é tudo',
  'só pelo Instagram',
  'nunca',
  '73%',
  'deixa eu MOSTRAR',
  'como ELA fez?',
];

const words = (text: string, startMs: number): TranscribedWord[] =>
  text.split(' ').map((t, i) => ({ text: t, startMs: startMs + i * 300, endMs: startMs + i * 300 + 280 }));

export const SAMPLE_PROJECT: Project = {
  version: 1,
  id: 'sample',
  name: 'Exemplo',
  video: { src: '', width: 1080, height: 1920, durationMs: SAMPLE_TEXTS.length * 2000, fps: 30 },
  phrases: SAMPLE_TEXTS.map((t, i) => {
    const p = buildPhrase(words(t, i * 2000), PRESETS[i].id);
    return { ...p, id: `sample_${i}` };
  }),
  customPresets: [],
};
