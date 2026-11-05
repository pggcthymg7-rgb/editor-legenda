// Escolhida no build: `npm run build:pwa` (VITE_TARGET=device) = iPhone; padrão = Mac com servidor local.
import { devicePlatform } from './device';
import { macPlatform } from './mac';
import type { Platform } from './types';

export const platform: Platform = import.meta.env.VITE_TARGET === 'device' ? devicePlatform : macPlatform;
export * from './types';
