/**
 * Gender presets applied via the panel's segmented Female/Neutral/Male
 * control. Each preset only names the morphs it cares about — applying one
 * (via `@avatarup/avatar-core`'s `applyMorphPreset`) overwrites just those
 * morphs and leaves every other user tweak untouched.
 *
 * `feminine`/`masculine` are separate morph targets that roughly cancel each
 * other out linearly rather than being mutually exclusive by construction
 * (see docs/asset-pipeline.md), so every preset pins both explicitly instead
 * of only setting the "active" one.
 */
export type Gender = 'female' | 'neutral' | 'male';

export const GENDER_PRESETS: Record<Gender, Record<string, number>> = {
  female: {
    feminine: 1,
    masculine: 0,
    bust: 0.35,
    buttocks: 0.25,
    'waist-narrow': 0.3,
    'shoulders-width': 0,
    'torso-v-shape': 0,
    muscular: 0,
  },
  neutral: {
    feminine: 0,
    masculine: 0,
    bust: 0,
    buttocks: 0,
    'waist-narrow': 0,
    'shoulders-width': 0,
    'torso-v-shape': 0,
    muscular: 0,
  },
  male: {
    feminine: 0,
    masculine: 1,
    bust: 0,
    buttocks: 0,
    'waist-narrow': 0,
    'shoulders-width': 0.35,
    'torso-v-shape': 0.3,
    muscular: 0.15,
  },
};
