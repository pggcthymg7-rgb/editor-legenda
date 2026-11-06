import type http from 'node:http';
export declare function provider(env?: Record<string, string | undefined>, userKey?: unknown): { name: string; url: string; model: string; key: string } | null;
export declare function clientIp(xff: unknown, remote?: unknown): string;
export declare function allow(ip: string, now?: number): boolean;
export declare function keyHash(key: unknown): string;
export declare function checkKeyQuota(hash: string, audioSec?: number, now?: number): { ok: boolean; error?: string; retryAfter?: number };
export declare function slim(json: unknown): { text: string; words: { word: string; start: number; end: number }[] };
export declare const server: http.Server;
