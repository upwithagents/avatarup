import { clamp01, type AvatarAppearance } from '@avatarup/avatar-core';

/** glTF material name -> which appearance color drives it. */
export const MATERIAL_COLOR_SLOTS: Record<string, keyof AvatarAppearance> = {
  skin: 'skinColor',
  hair: 'hairColor',
  eyes: 'eyeColor',
};

/**
 * Compute new morphTargetInfluences from a mesh's morph dictionary and a
 * profile's morph map. Unknown morph names are ignored; values clamp to [0,1].
 */
export function resolveMorphInfluences(
  dictionary: Record<string, number>,
  current: readonly number[],
  morphs: Record<string, number>
): number[] {
  const next = [...current];
  for (const [name, value] of Object.entries(morphs)) {
    const index = dictionary[name];
    if (index !== undefined) next[index] = clamp01(value);
  }
  return next;
}
