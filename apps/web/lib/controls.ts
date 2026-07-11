export const MODEL_URL = '/models/test-avatar.glb';

/** Sliders shown in the panel; morph names must match the model's morph targets. */
export const MORPH_CONTROLS: { morph: string; label: string }[] = [
  { morph: 'bulge', label: 'Bulge' },
  { morph: 'stretch', label: 'Stretch' },
];

export const COLOR_CONTROLS = [
  { key: 'skinColor', label: 'Skin' },
  { key: 'hairColor', label: 'Hair' },
  { key: 'eyeColor', label: 'Eyes' },
] as const;
