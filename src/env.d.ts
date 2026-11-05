/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 'device' = PWA que roda tudo no iPhone. */
  readonly VITE_TARGET?: 'device' | 'mac';
  /** URL do proxy de transcrição na nuvem */
  readonly VITE_CLOUD_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
