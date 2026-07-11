import { describe, expect, it } from 'vitest';
import { MATERIAL_COLOR_SLOTS, resolveMorphInfluences } from './apply-profile';

describe('resolveMorphInfluences', () => {
  const dictionary = { bulge: 0, stretch: 1 };

  it('sets influences for known morphs, leaves unknown indices untouched', () => {
    expect(resolveMorphInfluences(dictionary, [0, 0.9], { bulge: 0.5 })).toEqual([0.5, 0.9]);
  });

  it('ignores morph names not in the dictionary', () => {
    expect(resolveMorphInfluences(dictionary, [0, 0], { nose: 1 })).toEqual([0, 0]);
  });

  it('clamps values into [0,1]', () => {
    expect(resolveMorphInfluences(dictionary, [0, 0], { bulge: 7, stretch: -2 })).toEqual([1, 0]);
  });

  it('does not mutate the input array', () => {
    const current = [0.1, 0.2];
    resolveMorphInfluences(dictionary, current, { bulge: 1 });
    expect(current).toEqual([0.1, 0.2]);
  });
});

describe('MATERIAL_COLOR_SLOTS', () => {
  it('maps the asset material names to appearance keys', () => {
    expect(MATERIAL_COLOR_SLOTS).toEqual({
      skin: 'skinColor',
      hair: 'hairColor',
      eyes: 'eyeColor',
    });
  });
});
