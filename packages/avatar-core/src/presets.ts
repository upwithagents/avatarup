import { clamp01, type AvatarProfile } from './profile';

/**
 * Merges a named set of morph values into a profile's morphs, overwriting
 * only the morphs present in `morphs` and preserving everything else the
 * user has already tweaked (including morphs not mentioned by the preset).
 * Values are clamped to [0, 1] like any other morph write.
 */
export function applyMorphPreset(
  profile: AvatarProfile,
  morphs: Record<string, number>
): AvatarProfile {
  const clamped: Record<string, number> = {};
  for (const [name, value] of Object.entries(morphs)) {
    clamped[name] = clamp01(value);
  }
  return {
    ...profile,
    morphs: { ...profile.morphs, ...clamped },
  };
}
