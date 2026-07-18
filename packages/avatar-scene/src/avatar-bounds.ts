import type { Box3 } from 'three';

/** Named camera presets a host app can navigate to via {@link AvatarViewerHandle}. */
export type AvatarView = 'face' | 'torso' | 'full';

export interface LookAt {
  position: [number, number, number];
  target: [number, number, number];
}

// Fractions of total mesh height (plus the box's floor Y), derived from the
// legacy hand-tuned presets on a 1.67-unit-tall model (feet y=0, head top
// y≈1.67): position.y=1.58→0.946, position.z=0.75→0.449, target.y=1.58→0.946
// (face); position.y=1.47→0.880, position.z=1.39→0.832, target.y=1.32→0.790
// (torso); position.y=1.3→0.778, position.z=3.0→1.796, target.y=0.95→0.569
// (full). Reproducing those fractions on a mesh of any other height gives
// equivalent framing.
const PRESET_FRACTIONS: Record<
  AvatarView,
  { positionY: number; positionZ: number; targetY: number }
> = {
  face: { positionY: 0.946, positionZ: 0.449, targetY: 0.946 },
  torso: { positionY: 0.88, positionZ: 0.832, targetY: 0.79 },
  full: { positionY: 0.778, positionZ: 1.796, targetY: 0.569 },
};

/** Derives Face/Torso/Full camera presets from a mesh's world-space
 * bounding box, so avatars of different proportions than avatarup's
 * original asset still get sensibly framed. See docs/imported-avatar-format.md
 * for what a real imported avatar's bounds look like; verify framing
 * visually (screenshot) and adjust PRESET_FRACTIONS if it looks off for a
 * real export's proportions. */
export function computeViewPresets(box: Box3): Record<AvatarView, LookAt> {
  const groundY = box.min.y;
  const height = Math.max(box.max.y - groundY, 0.01); // avoid a degenerate/zero-height box
  const presets = {} as Record<AvatarView, LookAt>;
  for (const view of Object.keys(PRESET_FRACTIONS) as AvatarView[]) {
    const f = PRESET_FRACTIONS[view];
    presets[view] = {
      position: [0, groundY + height * f.positionY, height * f.positionZ],
      target: [0, groundY + height * f.targetY, 0],
    };
  }
  return presets;
}
