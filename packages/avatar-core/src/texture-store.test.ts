import { describe, expect, it } from 'vitest';
import {
  MAX_SKIN_TEXTURE_UPLOAD_BYTES,
  createInMemoryTextureDb,
  createTextureStore,
  validateSkinTextureUpload,
} from './texture-store';

describe('createTextureStore', () => {
  it('save then load round-trips a blob', async () => {
    const store = createTextureStore(createInMemoryTextureDb());
    const blob = new Blob(['hello'], { type: 'image/png' });
    await store.saveTexture('a', blob);
    expect(await store.loadTexture('a')).toBe(blob);
  });

  it('loadTexture returns null for an id that was never stored', async () => {
    const store = createTextureStore(createInMemoryTextureDb());
    expect(await store.loadTexture('missing')).toBeNull();
  });

  it('deleteTexture removes a stored blob', async () => {
    const store = createTextureStore(createInMemoryTextureDb());
    const blob = new Blob(['hello'], { type: 'image/png' });
    await store.saveTexture('a', blob);
    await store.deleteTexture('a');
    expect(await store.loadTexture('a')).toBeNull();
  });

  it('loadTexture falls back to null when the underlying db read throws', async () => {
    const store = createTextureStore({
      async put() {},
      async get() {
        throw new Error('corrupt record');
      },
      async delete() {},
    });
    expect(await store.loadTexture('a')).toBeNull();
  });
});

describe('validateSkinTextureUpload', () => {
  it('accepts a small PNG', () => {
    expect(validateSkinTextureUpload({ type: 'image/png', size: 1024 })).toEqual({ ok: true });
  });

  it('accepts a small JPEG', () => {
    expect(validateSkinTextureUpload({ type: 'image/jpeg', size: 1024 })).toEqual({ ok: true });
  });

  it('rejects an unsupported type', () => {
    const result = validateSkinTextureUpload({ type: 'image/gif', size: 1024 });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, error: expect.any(String) });
  });

  it('rejects a file over the size limit', () => {
    const result = validateSkinTextureUpload({
      type: 'image/png',
      size: MAX_SKIN_TEXTURE_UPLOAD_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, error: expect.any(String) });
  });

  it('accepts a file exactly at the size limit', () => {
    expect(
      validateSkinTextureUpload({ type: 'image/png', size: MAX_SKIN_TEXTURE_UPLOAD_BYTES })
    ).toEqual({ ok: true });
  });
});
