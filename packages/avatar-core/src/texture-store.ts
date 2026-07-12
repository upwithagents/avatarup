/** Minimal async key-value blob store — the exact surface `texture-store`
 * needs from IndexedDB. Injected (like storage.ts's `Pick<Storage, ...>`
 * pattern) so unit tests never need a browser/fake-indexeddb dependency. */
export interface TextureDb {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
}

export interface TextureStore {
  saveTexture(id: string, blob: Blob): Promise<void>;
  /** Resolves to null if the id was never stored, or on any read error
   * (e.g. a corrupt/evicted IndexedDB record) — callers should treat that
   * the same as "no texture available" rather than surface an exception. */
  loadTexture(id: string): Promise<Blob | null>;
  deleteTexture(id: string): Promise<void>;
}

export function createTextureStore(db: TextureDb): TextureStore {
  return {
    saveTexture(id, blob) {
      return db.put(id, blob);
    },
    async loadTexture(id) {
      try {
        return await db.get(id);
      } catch {
        return null;
      }
    },
    deleteTexture(id) {
      return db.delete(id);
    },
  };
}

/** In-memory `TextureDb` fake for tests — no IndexedDB/browser required. */
export function createInMemoryTextureDb(): TextureDb {
  const data = new Map<string, Blob>();
  return {
    async put(id, blob) {
      data.set(id, blob);
    },
    async get(id) {
      return data.get(id) ?? null;
    },
    async delete(id) {
      data.delete(id);
    },
  };
}

const DB_NAME = 'avatarup-textures';
const STORE_NAME = 'skin-textures';
const DB_VERSION = 1;

/** Real IndexedDB-backed `TextureDb`. Browser-only (uses the global
 * `indexedDB`); the connection is opened lazily on first use. Not covered
 * by unit tests — exercised via the browser e2e scripts instead. */
export function openTextureDb(): TextureDb {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function open(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  async function run<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = fn(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async put(id, blob) {
      await run('readwrite', (store) => store.put(blob, id));
    },
    async get(id) {
      const result = await run<Blob | undefined>('readonly', (store) => store.get(id));
      return result ?? null;
    },
    async delete(id) {
      await run('readwrite', (store) => store.delete(id));
    },
  };
}

export const MAX_SKIN_TEXTURE_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_SKIN_TEXTURE_TYPES = new Set(['image/png', 'image/jpeg']);

export type UploadValidation = { ok: true } | { ok: false; error: string };

/** Validates a skin-texture upload's type and size. Takes a duck-typed
 * `{ type, size }` (what `File`/`Blob` provide) rather than the DOM `File`
 * type, so it's unit-testable without a browser. */
export function validateSkinTextureUpload(file: { type: string; size: number }): UploadValidation {
  if (!ALLOWED_SKIN_TEXTURE_TYPES.has(file.type)) {
    return { ok: false, error: 'Please choose a PNG or JPG image.' };
  }
  if (file.size > MAX_SKIN_TEXTURE_UPLOAD_BYTES) {
    return { ok: false, error: 'Image is too large — please choose one under 4MB.' };
  }
  return { ok: true };
}
