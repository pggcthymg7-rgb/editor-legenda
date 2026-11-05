/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 'device' = PWA que roda tudo no iPhone. */
  readonly VITE_TARGET?: 'device' | 'mac';
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
