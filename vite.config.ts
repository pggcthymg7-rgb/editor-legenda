import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const API = 'http://127.0.0.1:3210';

// Versão iPhone (PWA): tudo roda no aparelho. Só fala com a OpenAI (se o usuário usar)
// e com o Hugging Face (modelo do Whisper local, se usar).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data: https://api.openai.com https://huggingface.co https://*.huggingface.co https://*.hf.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const pwaHead = (): Plugin => ({
  name: 'pwa-head',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Legendas' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'theme-color', content: '#111114' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' }, injectTo: 'head' },
  ],
});

export default defineConfig(({ mode }) => {
  const device = mode === 'pwa';
  return {
    base: process.env.BASE_PATH ?? '/',
    plugins: [
      react(),
      ...(device
        ? [
            pwaHead(),
            VitePWA({
              registerType: 'autoUpdate',
              injectRegister: 'script',
              manifest: {
                name: 'Editor de Legendas',
                short_name: 'Legendas',
                description: 'Legendas animadas estilo reels, editáveis, geradas no próprio iPhone.',
                lang: 'pt-BR',
                display: 'standalone',
                orientation: 'portrait',
                background_color: '#111114',
                theme_color: '#111114',
                start_url: '.',
                scope: '.',
                icons: [
                  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
              },
              workbox: {
                // app + fontes ficam offline; Whisper local (wasm grande) só quando usado
                globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
                globIgnores: ['**/*ort*.wasm', '**/transformers*.js', '**/mediabunny-mp3*', '**/mediabunny-flac*'],
                maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
                navigateFallback: 'index.html',
                runtimeCaching: [
                  {
                    urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.wasm'),
                    handler: 'CacheFirst',
                    options: { cacheName: 'wasm', expiration: { maxEntries: 10 } },
                  },
                ],
              },
            }),
          ]
        : []),
    ],
    build: { outDir: device ? 'dist-pwa' : 'dist' },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: { '/api': API, '/media': API },
    },
    // whisper-webgpu usa onnxruntime-web; não pré-empacotar
    optimizeDeps: { exclude: ['@remotion/whisper-webgpu', '@huggingface/transformers', 'onnxruntime-web'] },
  };
});
