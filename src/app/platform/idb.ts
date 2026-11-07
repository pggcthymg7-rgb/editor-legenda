// IndexedDB mínimo, sem dependência. Guarda projetos e vídeos no aparelho.
const DB_NAME = 'editor-legenda';
const DB_VERSION = 3;
export type StoreName = 'projects' | 'videos' | 'masks' | 'thumbs';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of ['projects', 'videos', 'masks', 'thumbs'] as const) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('IndexedDB indisponível'));
    };
  });
  return dbPromise;
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error ?? new Error('transação abortada (espaço cheio?)'));
  });
}

export const idbGet = <T>(store: StoreName, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key));
export const idbPut = (store: StoreName, key: string, value: unknown) => run(store, 'readwrite', (s) => s.put(value, key)).then(() => undefined);
export const idbDelete = (store: StoreName, key: string) => run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined);
/** Apaga todas as chaves que começam com o prefixo. */
export async function idbDeletePrefix(store: StoreName, prefix: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff'));
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Grava vários valores numa transação só (rápido para centenas de máscaras). */
export async function idbPutMany(store: StoreName, entries: [string, unknown][]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    for (const [k, v] of entries) s.put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('sem espaço no aparelho'));
  });
}

export const idbAll = <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);

/** Só para testes. */
export function _resetIdb() {
  dbPromise = null;
}
