import { describe, expect, it } from 'vitest';
import { createDefaultProfile } from './profile';
import { applyMorphPreset } from './presets';

describe('applyMorphPreset', () => {
  it('overwrites only the named morphs, preserving other user tweaks', () => {
    const profile = createDefaultProfile();
    profile.morphs['jaw-width'] = 0.9; // user's own tweak, unrelated to the preset
    profile.morphs.feminine = 0.2; // will be overwritten by the preset

    const result = applyMorphPreset(profile, { feminine: 1, masculine: 0, bust: 0.35 });

    expect(result.morphs).toEqual({
      'jaw-width': 0.9,
      feminine: 1,
      masculine: 0,
      bust: 0.35,
    });
  });

  it('does not mutate the input profile', () => {
    const profile = createDefaultProfile();
    profile.morphs.feminine = 0;
    const result = applyMorphPreset(profile, { feminine: 1 });

    expect(profile.morphs.feminine).toBe(0);
    expect(result.morphs.feminine).toBe(1);
    expect(result).not.toBe(profile);
  });

  it('clamps preset values to [0, 1]', () => {
    const profile = createDefaultProfile();
    const result = applyMorphPreset(profile, { bust: 1.5, buttocks: -0.5 });
    expect(result.morphs).toEqual({ bust: 1, buttocks: 0 });
  });

  it('preserves appearance and other profile fields untouched', () => {
    const profile = createDefaultProfile();
    profile.appearance.hairColor = '#123456';
    const result = applyMorphPreset(profile, { feminine: 1 });
    expect(result.appearance).toEqual(profile.appearance);
    expect(result.version).toBe(2);
  });
});
