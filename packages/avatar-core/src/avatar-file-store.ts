/** Minimal async blob store for the single active imported avatar. Injected
 * (like storage.ts's `Pick<Storage, ...>` and texture-store.ts's
 * `TextureDb` pattern) so unit tests never need a browser/IndexedDB. */
export interface AvatarFileDb {
  put(blob: Blob): Promise<void>;
  get(): Promise<Blob | null>;
  delete(): Promise<void>;
}

export interface AvatarFileStore {
  saveAvatar(blob: Blob): Promise<void>;
  /** Resolves to null if nothing was ever stored, or on any read error
   * (e.g. a corrupt/evicted IndexedDB record) — callers should treat that
   * the same as "no avatar available" rather than surface an exception. */
  loadAvatar(): Promise<Blob | null>;
  clearAvatar(): Promise<void>;
}

export function createAvatarFileStore(db: AvatarFileDb): AvatarFileStore {
  return {
    saveAvatar(blob) {
      return db.put(blob);
    },
    async loadAvatar() {
      try {
        return await db.get();
      } catch {
        return null;
      }
    },
    clearAvatar() {
      return db.delete();
    },
  };
}

/** In-memory `AvatarFileDb` fake for tests — no IndexedDB/browser required. */
export function createInMemoryAvatarFileDb(): AvatarFileDb {
  let data: Blob | null = null;
  return {
    async put(blob) {
      data = blob;
    },
    async get() {
      return data;
    },
    async delete() {
      data = null;
    },
  };
}

const DB_NAME = 'avatarup-avatar-file';
const STORE_NAME = 'current-avatar';
const RECORD_KEY = 'current';
const DB_VERSION = 1;

/** Real IndexedDB-backed `AvatarFileDb`. Browser-only (uses the global
 * `indexedDB`); the connection is opened lazily on first use. Not covered
 * by unit tests — exercised via the browser e2e scripts instead. Uses its
 * own database, separate from texture-store.ts's, so clearing one never
 * touches the other. */
export function openAvatarFileDb(): AvatarFileDb {
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
    async put(blob) {
      await run('readwrite', (store) => store.put(blob, RECORD_KEY));
    },
    async get() {
      const result = await run<Blob | undefined>('readonly', (store) => store.get(RECORD_KEY));
      return result ?? null;
    },
    async delete() {
      await run('readwrite', (store) => store.delete(RECORD_KEY));
    },
  };
}

export const MAX_AVATAR_UPLOAD_BYTES = 50 * 1024 * 1024;

export type AvatarFileValidation = { ok: true } | { ok: false; error: string };

/** Validates an avatar upload's extension and size. Duck-typed
 * `{ name, size }` (what `File` provides) so it's unit-testable without a
 * browser. glTF/GLB MIME types are unreliable across browsers/OSes, so
 * this checks the file extension, not `file.type` — the actual structural
 * validation (is it really a loadable glTF) happens by attempting a real
 * parse before persisting, in apps/web's import flow (Task 5). */
export function validateAvatarUpload(file: { name: string; size: number }): AvatarFileValidation {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) {
    return { ok: false, error: 'Please choose a .glb or .gltf file.' };
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    return { ok: false, error: 'File is too large — please choose one under 50MB.' };
  }
  return { ok: true };
}
