/// <reference lib="webworker" />
// Web Worker do rastreio 3D: recebe quadros cinza (transferidos, sem cópia) e devolve o Track3D.
import { CameraTracker, type PipelineOpts } from './pipeline';

export type WorkerIn = { type: 'start'; opts: PipelineOpts } | { type: 'frame'; gray: Uint8Array } | { type: 'finish' };
export type WorkerOut =
  | { type: 'progress'; stage: 'track' | 'solve'; value: number }
  | { type: 'done'; result: import('./model').Track3D | null; ms: number }
  | { type: 'error'; message: string };

let tracker: CameraTracker | null = null;
let t0 = 0;
const post = (m: WorkerOut) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  try {
    const m = e.data;
    if (m.type === 'start') {
      tracker = new CameraTracker(m.opts);
      t0 = performance.now();
    } else if (m.type === 'frame') {
      tracker!.push(m.gray);
      post({ type: 'progress', stage: 'track', value: tracker!.frames });
    } else {
      const result = tracker!.finish((v) => post({ type: 'progress', stage: 'solve', value: v }));
      post({ type: 'done', result, ms: performance.now() - t0 });
      tracker = null;
    }
  } catch (err) {
    post({ type: 'error', message: (err as Error).message });
  }
};
