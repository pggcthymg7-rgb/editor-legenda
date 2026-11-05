import type http from 'node:http';
export declare function provider(env?: Record<string, string | undefined>): { name: string; url: string; model: string; key: string } | null;
export declare function allow(ip: string, now?: number): boolean;
export declare function slim(json: unknown): { text: string; words: { word: string; start: number; end: number }[] };
export declare const server: http.Server;
