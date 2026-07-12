export const MODEL_URL = '/models/avatar-base.glb';

/** Sliders shown in the panel; morph names must match the model's morph targets. */
export const MORPH_CONTROLS: { morph: string; label: string }[] = [
  // Body macros (baked from MPFB2's macro target system)
  { morph: 'feminine', label: 'Feminine' },
  { morph: 'masculine', label: 'Masculine' },
  { morph: 'muscular', label: 'Muscular' },
  { morph: 'heavyset', label: 'Heavyset' },
  { morph: 'slender', label: 'Slender' },
  { morph: 'tall', label: 'Tall' },
  { morph: 'petite', label: 'Petite' },
  // Body details
  { morph: 'belly', label: 'Belly' },
  { morph: 'bust', label: 'Bust' },
  { morph: 'buttocks', label: 'Buttocks' },
  // Face
  { morph: 'head-round', label: 'Round face' },
  { morph: 'jaw-width', label: 'Jaw width' },
  { morph: 'chin-prominent', label: 'Chin size' },
  { morph: 'nose-size', label: 'Nose size' },
  { morph: 'nose-width', label: 'Nose width' },
  { morph: 'mouth-width', label: 'Mouth width' },
  { morph: 'lip-fullness', label: 'Lip fullness' },
  { morph: 'eye-size', label: 'Eye size' },
  { morph: 'cheek-fullness', label: 'Cheek fullness' },
  { morph: 'ear-size', label: 'Ear size' },
];

export const COLOR_CONTROLS = [
  { key: 'skinColor', label: 'Skin' },
  { key: 'hairColor', label: 'Hair' },
  { key: 'eyeColor', label: 'Eyes' },
] as const;
