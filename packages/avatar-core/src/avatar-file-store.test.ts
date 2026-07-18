import { describe, expect, it } from 'vitest';
import {
  createAvatarFileStore,
  createInMemoryAvatarFileDb,
  validateAvatarUpload,
  MAX_AVATAR_UPLOAD_BYTES,
  type AvatarFileDb,
} from './avatar-file-store';

describe('createAvatarFileStore', () => {
  it('loadAvatar returns null when nothing stored', async () => {
    const store = createAvatarFileStore(createInMemoryAvatarFileDb());
    expect(await store.loadAvatar()).toBeNull();
  });

  it('saveAvatar then loadAvatar round-trips the blob', async () => {
    const store = createAvatarFileStore(createInMemoryAvatarFileDb());
    const blob = new Blob(['glb-bytes'], { type: 'model/gltf-binary' });
    await store.saveAvatar(blob);
    expect(await store.loadAvatar()).toBe(blob);
  });

  it('saveAvatar replaces any previously stored avatar', async () => {
    const store = createAvatarFileStore(createInMemoryAvatarFileDb());
    await store.saveAvatar(new Blob(['first']));
    const second = new Blob(['second']);
    await store.saveAvatar(second);
    expect(await store.loadAvatar()).toBe(second);
  });

  it('clearAvatar removes the stored avatar', async () => {
    const store = createAvatarFileStore(createInMemoryAvatarFileDb());
    await store.saveAvatar(new Blob(['data']));
    await store.clearAvatar();
    expect(await store.loadAvatar()).toBeNull();
  });

  it('loadAvatar falls back to null on a read error', async () => {
    const throwingDb: AvatarFileDb = {
      async put() {},
      async get(): Promise<Blob | null> {
        throw new Error('boom');
      },
      async delete() {},
    };
    const store = createAvatarFileStore(throwingDb);
    expect(await store.loadAvatar()).toBeNull();
  });
});

describe('validateAvatarUpload', () => {
  it('accepts .glb and .gltf files (case-insensitive) under the size limit', () => {
    expect(validateAvatarUpload({ name: 'avatar.glb', size: 1024 })).toEqual({ ok: true });
    expect(validateAvatarUpload({ name: 'Avatar.GLTF', size: 1024 })).toEqual({ ok: true });
  });

  it('rejects other extensions', () => {
    expect(validateAvatarUpload({ name: 'avatar.fbx', size: 1024 }).ok).toBe(false);
  });

  it('rejects files over the size limit', () => {
    const result = validateAvatarUpload({ name: 'avatar.glb', size: MAX_AVATAR_UPLOAD_BYTES + 1 });
    expect(result.ok).toBe(false);
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateAvatarUpload({ name: 'avatar.glb', size: MAX_AVATAR_UPLOAD_BYTES })).toEqual({
      ok: true,
    });
  });
});
