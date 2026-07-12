import { describe, expect, it } from 'vitest';
import { createDefaultProfile } from './profile';
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
      memoryStorage({ 'avatarup.profile.v1': '{corrupt' })
    );
    expect(store.load()).toEqual(createDefaultProfile());
  });
});
