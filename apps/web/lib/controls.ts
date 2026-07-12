// Panel controls are generated from the Blender pipeline's controls manifest
// (scripts/fixtures/controls-manifest.json) — the single source of truth for
// morph names/labels, guaranteed to match the exported model (the Blender
// script raises if they ever diverge). Imported directly as JSON rather than
// copied into apps/web: apps/web's tsconfig already has resolveJsonModule
// enabled, and both webpack (dev/prod) and Turbopack parse `.json` imports
// natively regardless of workspace boundaries, so no build step or generated
// TS file is needed to keep this in sync.
import manifest from '../../../scripts/fixtures/controls-manifest.json';

export const MODEL_URL = '/models/avatar-base.glb';

export const GROUP_ORDER = [
  'Body',
  'Torso',
  'Head',
  'Face',
  'Eyes',
  'Nose',
  'Mouth',
] as const;

export type ControlGroup = (typeof GROUP_ORDER)[number];

export interface MorphControl {
  group: ControlGroup;
  morph: string;
  label: string;
}

/** All 46 morph controls, in manifest order (source of truth: the asset pipeline). */
export const MORPH_CONTROLS: MorphControl[] = manifest as MorphControl[];

export interface MorphControlGroup {
  group: ControlGroup;
  controls: MorphControl[];
}

/** Controls bucketed by group, in the fixed display order Body..Mouth. Computed
 * once at module load so the panel can render it as a stable, non-remounting list. */
export const GROUPED_CONTROLS: MorphControlGroup[] = GROUP_ORDER.map((group) => ({
  group,
  controls: MORPH_CONTROLS.filter((c) => c.group === group),
}));

export const COLOR_CONTROLS = [
  { key: 'skinColor', label: 'Skin' },
  { key: 'hairColor', label: 'Hair' },
  { key: 'eyeColor', label: 'Eyes' },
] as const;
