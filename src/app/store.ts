// Estado do projeto com desfazer/refazer (até 100 passos).
import { useCallback, useReducer } from 'react';
import type { Project } from '../core/types';

type State = { past: Project[]; present: Project | null; future: Project[] };
type Action =
  | { type: 'load'; project: Project | null }
  | { type: 'apply'; fn: (p: Project) => Project; merge?: boolean }
  | { type: 'undo' }
  | { type: 'redo' };

const LIMIT = 100;
let lastMergeAt = 0;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'load':
      return { past: [], present: a.project, future: [] };
    case 'apply': {
      if (!s.present) return s;
      const next = a.fn(s.present);
      if (next === s.present) return s;
      // edições seguidas (arrastar, digitar) dentro de 600 ms viram um passo só
      const now = Date.now();
      const merge = a.merge && now - lastMergeAt < 600;
      lastMergeAt = a.merge ? now : 0;
      const past = merge ? s.past : [...s.past, s.present].slice(-LIMIT);
      return { past, present: next, future: [] };
    }
    case 'undo': {
      if (!s.past.length || !s.present) return s;
      return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] };
    }
    case 'redo': {
      if (!s.future.length || !s.present) return s;
      return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
    }
  }
}

export function useProjectStore() {
  const [state, dispatch] = useReducer(reducer, { past: [], present: null, future: [] });
  const apply = useCallback((fn: (p: Project) => Project, merge = false) => dispatch({ type: 'apply', fn, merge }), []);
  const load = useCallback((project: Project | null) => dispatch({ type: 'load', project }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  return { project: state.present, apply, load, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
