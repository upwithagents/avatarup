import { describe, expect, it } from 'vitest';
import {
  clamp01,
  createDefaultProfile,
  deserializeProfile,
  serializeProfile,
  withSkinTexture,
} from './profile';

describe('createDefaultProfile', () => {
  it('returns a versioned profile with empty morphs, default colors, and no skin texture', () => {
    const p = createDefaultProfile();
    expect(p.version).toBe(2);
    expect(p.morphs).toEqual({});
    expect(p.appearance.skinColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.appearance.hairColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.appearance.eyeColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.appearance.skinTexture).toBeNull();
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
  it('preserves a valid v2 profile with no skin texture', () => {
    const p = createDefaultProfile();
    p.morphs['jaw-width'] = 0.7;
    p.appearance.hairColor = '#123456';
    expect(deserializeProfile(serializeProfile(p))).toEqual(p);
  });

  it('preserves a valid v2 profile with a preset skin texture', () => {
    const p = createDefaultProfile();
    p.appearance.skinTexture = { kind: 'preset', id: 'medium' };
    expect(deserializeProfile(serializeProfile(p))).toEqual(p);
  });

  it('preserves a valid v2 profile with an upload skin texture', () => {
    const p = createDefaultProfile();
    p.appearance.skinTexture = { kind: 'upload', id: 'abc-123' };
    expect(deserializeProfile(serializeProfile(p))).toEqual(p);
  });
});

describe('withSkinTexture', () => {
  it('sets a preset texture and resets skinColor to white', () => {
    const p = createDefaultProfile();
    p.appearance.skinColor = '#c68863';
    const result = withSkinTexture(p, { kind: 'preset', id: 'medium' });
    expect(result.appearance.skinTexture).toEqual({ kind: 'preset', id: 'medium' });
    expect(result.appearance.skinColor).toBe('#ffffff');
  });

  it('sets an upload texture and resets skinColor to white', () => {
    const p = createDefaultProfile();
    p.appearance.skinColor = '#112233';
    const result = withSkinTexture(p, { kind: 'upload', id: 'abc-123' });
    expect(result.appearance.skinTexture).toEqual({ kind: 'upload', id: 'abc-123' });
    expect(result.appearance.skinColor).toBe('#ffffff');
  });

  it('clears the texture and restores the default skin color', () => {
    const p = createDefaultProfile();
    p.appearance.skinTexture = { kind: 'preset', id: 'medium' };
    p.appearance.skinColor = '#ffffff';
    const result = withSkinTexture(p, null);
    expect(result.appearance.skinTexture).toBeNull();
    expect(result.appearance.skinColor).toBe(createDefaultProfile().appearance.skinColor);
  });

  it('does not mutate other appearance/morph fields', () => {
    const p = createDefaultProfile();
    p.morphs['jaw-width'] = 0.4;
    p.appearance.hairColor = '#654321';
    const result = withSkinTexture(p, { kind: 'preset', id: 'fair' });
    expect(result.morphs).toEqual({ 'jaw-width': 0.4 });
    expect(result.appearance.hairColor).toBe('#654321');
  });
});

describe('deserializeProfile fallbacks', () => {
  it('returns v2 defaults for null, undefined, garbage, and unknown versions', () => {
    const d = createDefaultProfile();
    expect(deserializeProfile(null)).toEqual(d);
    expect(deserializeProfile(undefined)).toEqual(d);
    expect(deserializeProfile('not json {')).toEqual(d);
    expect(deserializeProfile('42')).toEqual(d);
    expect(deserializeProfile('{"version":99}')).toEqual(d);
  });

  it('clamps out-of-range morphs and drops non-numeric ones (v2)', () => {
    const p = deserializeProfile(
      '{"version":2,"morphs":{"a":2,"b":-1,"c":"x","d":0.5},"appearance":{}}'
    );
    expect(p.morphs).toEqual({ a: 1, b: 0, d: 0.5 });
  });

  it('fills missing appearance fields with defaults (v2)', () => {
    const p = deserializeProfile('{"version":2,"morphs":{},"appearance":{"hairColor":"#000000"}}');
    expect(p.appearance.hairColor).toBe('#000000');
    expect(p.appearance.skinColor).toBe(createDefaultProfile().appearance.skinColor);
    expect(p.appearance.skinTexture).toBeNull();
  });

  it('drops a malformed skinTexture object back to null (v2)', () => {
    const p = deserializeProfile(
      '{"version":2,"morphs":{},"appearance":{"skinTexture":{"kind":"bogus","id":"x"}}}'
    );
    expect(p.appearance.skinTexture).toBeNull();

    const p2 = deserializeProfile(
      '{"version":2,"morphs":{},"appearance":{"skinTexture":{"kind":"preset"}}}'
    );
    expect(p2.appearance.skinTexture).toBeNull();
  });
});

describe('v1 -> v2 migration', () => {
  it('keeps morphs and colors, adds skinTexture: null, and remaps the legacy eye-color default', () => {
    const p = deserializeProfile(
      '{"version":1,"morphs":{"jaw-width":0.7},"appearance":{"skinColor":"#c68863","hairColor":"#3b2f2f","eyeColor":"#4a6c8c"}}'
    );
    expect(p.version).toBe(2);
    expect(p.morphs).toEqual({ 'jaw-width': 0.7 });
    expect(p.appearance.skinColor).toBe('#c68863');
    expect(p.appearance.hairColor).toBe('#3b2f2f');
    expect(p.appearance.eyeColor).toBe(createDefaultProfile().appearance.eyeColor);
    expect(p.appearance.skinTexture).toBeNull();
  });

  it('preserves a non-default v1 eye color untouched', () => {
    const p = deserializeProfile(
      '{"version":1,"morphs":{},"appearance":{"eyeColor":"#112233"}}'
    );
    expect(p.appearance.eyeColor).toBe('#112233');
  });

  it('leaves the current neutral default eye color untouched (only the legacy literal is remapped)', () => {
    const defaultEye = createDefaultProfile().appearance.eyeColor;
    const p = deserializeProfile(
      `{"version":1,"morphs":{},"appearance":{"eyeColor":"${defaultEye}"}}`
    );
    expect(p.appearance.eyeColor).toBe(defaultEye);
  });

  it('migrates a v1 profile with no appearance/eyeColor at all to v2 defaults', () => {
    const p = deserializeProfile('{"version":1,"morphs":{"a":0.5}}');
    expect(p.version).toBe(2);
    expect(p.morphs).toEqual({ a: 0.5 });
    expect(p.appearance).toEqual(createDefaultProfile().appearance);
  });
});
