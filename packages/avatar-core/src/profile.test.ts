import { describe, expect, it } from 'vitest';
import {
  clamp01,
  createDefaultProfile,
  deserializeProfile,
  serializeProfile,
} from './profile';

describe('createDefaultProfile', () => {
  it('returns a versioned profile with empty morphs and default colors', () => {
    const p = createDefaultProfile();
    expect(p.version).toBe(1);
    expect(p.morphs).toEqual({});
    expect(p.appearance.skinColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.appearance.hairColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.appearance.eyeColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('clamp01', () => {
  it('clamps below, above, and passes through in-range values', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.25)).toBe(0.25);
  });
  it('treats NaN as 0', () => {
    expect(clamp01(NaN)).toBe(0);
  });
});

describe('serialize/deserialize round trip', () => {
  it('preserves a valid profile', () => {
    const p = createDefaultProfile();
    p.morphs['jaw-width'] = 0.7;
    p.appearance.hairColor = '#123456';
    expect(deserializeProfile(serializeProfile(p))).toEqual(p);
  });
});

describe('deserializeProfile fallbacks', () => {
  it('returns defaults for null, undefined, garbage, and wrong shapes', () => {
    const d = createDefaultProfile();
    expect(deserializeProfile(null)).toEqual(d);
    expect(deserializeProfile(undefined)).toEqual(d);
    expect(deserializeProfile('not json {')).toEqual(d);
    expect(deserializeProfile('42')).toEqual(d);
    expect(deserializeProfile('{"version":99}')).toEqual(d);
  });

  it('clamps out-of-range morphs and drops non-numeric ones', () => {
    const p = deserializeProfile(
      '{"version":1,"morphs":{"a":2,"b":-1,"c":"x","d":0.5},"appearance":{}}'
    );
    expect(p.morphs).toEqual({ a: 1, b: 0, d: 0.5 });
  });

  it('fills missing appearance fields with defaults', () => {
    const p = deserializeProfile('{"version":1,"morphs":{},"appearance":{"hairColor":"#000000"}}');
    expect(p.appearance.hairColor).toBe('#000000');
    expect(p.appearance.skinColor).toBe(createDefaultProfile().appearance.skinColor);
  });
});
