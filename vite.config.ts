import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = 'http://127.0.0.1:3210';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': API, '/media': API },
  },
  // whisper-webgpu usa onnxruntime-web; não pré-empacotar
  optimizeDeps: { exclude: ['@remotion/whisper-webgpu', '@huggingface/transformers', 'onnxruntime-web'] },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
} as never);
