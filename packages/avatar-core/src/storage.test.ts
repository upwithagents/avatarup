import { describe, expect, it } from 'vitest';
import { PROFILE_STORAGE_KEY, createDefaultProfile } from './profile';
import { createProfileStore } from './storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    dump: () => Object.fromEntries(data),
  };
}

describe('createProfileStore', () => {
  it('load returns defaults when nothing stored', () => {
    const store = createProfileStore(memoryStorage());
    expect(store.load()).toEqual(createDefaultProfile());
  });

  it('save then load round-trips', () => {
    const storage = memoryStorage();
    const store = createProfileStore(storage);
    const p = createDefaultProfile();
    p.morphs['bulge'] = 0.4;
    store.save(p);
    expect(store.load()).toEqual(p);
  });

  it('load falls back to defaults on corrupt stored JSON', () => {
    const store = createProfileStore(
      memoryStorage({ [PROFILE_STORAGE_KEY]: '{corrupt' })
    );
    expect(store.load()).toEqual(createDefaultProfile());
  });

  it('load migrates a v1 profile found under the (unchanged) storage key to v2', () => {
    const v1Json = JSON.stringify({
      version: 1,
      morphs: { 'jaw-width': 0.5 },
      appearance: { skinColor: '#c68863', hairColor: '#3b2f2f', eyeColor: '#4a6c8c' },
    });
    const store = createProfileStore(memoryStorage({ [PROFILE_STORAGE_KEY]: v1Json }));
    const loaded = store.load();
    expect(loaded.version).toBe(2);
    expect(loaded.morphs).toEqual({ 'jaw-width': 0.5 });
    expect(loaded.appearance.eyeColor).toBe(createDefaultProfile().appearance.eyeColor);
    expect(loaded.appearance.skinTexture).toBeNull();
  });
});
