/** A reference to a skin texture: a bundled preset (shipped under
 * apps/web/public/textures/skin/) or a user upload (blob stored in the
 * texture store, see texture-store.ts). Resolving `id` to an actual image
 * source is the host app's job — avatar-core only carries the reference. */
export interface SkinTextureRef {
  kind: 'preset' | 'upload';
  id: string;
}

export interface AvatarAppearance {
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  /** null = no texture, plain material.color only. */
  skinTexture: SkinTextureRef | null;
}

export interface AvatarProfile {
  version: 2;
  /** morph target name -> influence, always within [0, 1] */
  morphs: Record<string, number>;
  appearance: AvatarAppearance;
}

/** localStorage key. Kept stable (not renamed to "v2") across profile
 * versions so `deserializeProfile` can find and migrate older saved data —
 * the version lives in the JSON payload's `version` field, not the key. */
export const PROFILE_STORAGE_KEY = 'avatarup.profile.v1';

/** Legacy default eye color from before the eyes material got a real
 * texture (sclera + iris). A saturated default tints the whole sclera, so
 * v1 -> v2 migration remaps exactly this literal to the current neutral
 * default; user-customized eye colors are left untouched. */
const LEGACY_DEFAULT_EYE_COLOR = '#4a6c8c';

const DEFAULT_APPEARANCE: AvatarAppearance = {
  skinColor: '#c68863',
  hairColor: '#3b2f2f',
  // Near-neutral: the eyes material is textured (white sclera + brown iris)
  // and material.color multiplies the whole texture, so saturated defaults
  // would tint the sclera too.
  eyeColor: '#f2ece4',
  skinTexture: null,
};

export function createDefaultProfile(): AvatarProfile {
  return {
    version: 2,
    morphs: {},
    appearance: { ...DEFAULT_APPEARANCE },
  };
}

/** `material.color` multiplies `material.map` in three.js's
 * MeshStandardMaterial (see AvatarModel's skin-texture effect), so applying
 * a saturated tint on top of a photographic/procedural skin texture blows
 * out its tone. White is a no-op multiplier, so a freshly-applied texture
 * renders at its own natural tone; the user can still re-tint afterwards
 * via the color picker. */
export const TEXTURED_SKIN_COLOR = '#ffffff';

/**
 * Sets (or clears) `appearance.skinTexture`, applying the least-surprising
 * tint semantic: applying a texture (preset or upload) resets `skinColor`
 * to white one-time so it doesn't multiply against the texture's own tone;
 * clearing it back to `null` restores the default skin color. A color the
 * user picks afterwards is untouched until the next texture change.
 */
export function withSkinTexture(
  profile: AvatarProfile,
  skinTexture: SkinTextureRef | null
): AvatarProfile {
  return {
    ...profile,
    appearance: {
      ...profile.appearance,
      skinTexture,
      skinColor: skinTexture ? TEXTURED_SKIN_COLOR : DEFAULT_APPEARANCE.skinColor,
    },
  };
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function serializeProfile(profile: AvatarProfile): string {
  return JSON.stringify(profile);
}

function parseSkinTexture(value: unknown): SkinTextureRef | null {
  if (typeof value !== 'object' || value === null) return null;
  const ref = value as Record<string, unknown>;
  if (ref.kind !== 'preset' && ref.kind !== 'upload') return null;
  if (typeof ref.id !== 'string' || ref.id.length === 0) return null;
  return { kind: ref.kind, id: ref.id };
}

/** Parses the shared morphs/skinColor/hairColor/eyeColor fields present in
 * both v1 and v2 payloads onto a freshly-created default profile. */
function parseCommonFields(candidate: Record<string, unknown>): AvatarProfile {
  const profile = createDefaultProfile();

  if (typeof candidate.morphs === 'object' && candidate.morphs !== null) {
    for (const [name, value] of Object.entries(candidate.morphs)) {
      if (typeof value === 'number') profile.morphs[name] = clamp01(value);
    }
  }

  if (typeof candidate.appearance === 'object' && candidate.appearance !== null) {
    const appearance = candidate.appearance as Record<string, unknown>;
    for (const key of ['skinColor', 'hairColor', 'eyeColor'] as const) {
      if (typeof appearance[key] === 'string') {
        profile.appearance[key] = appearance[key];
      }
    }
  }

  return profile;
}

export function deserializeProfile(json: string | null | undefined): AvatarProfile {
  if (!json) return createDefaultProfile();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return createDefaultProfile();
  }
  if (typeof raw !== 'object' || raw === null) return createDefaultProfile();
  const candidate = raw as Record<string, unknown>;

  if (candidate.version === 2) {
    const profile = parseCommonFields(candidate);
    const appearance =
      typeof candidate.appearance === 'object' && candidate.appearance !== null
        ? (candidate.appearance as Record<string, unknown>)
        : {};
    profile.appearance.skinTexture = parseSkinTexture(appearance.skinTexture);
    return profile;
  }

  if (candidate.version === 1) {
    // Migrate: same morphs/colors, skinTexture starts unset, and the old
    // saturated eye-color default gets remapped to the current neutral one
    // (see LEGACY_DEFAULT_EYE_COLOR) — a user-customized eye color is left
    // untouched.
    const profile = parseCommonFields(candidate);
    if (profile.appearance.eyeColor === LEGACY_DEFAULT_EYE_COLOR) {
      profile.appearance.eyeColor = DEFAULT_APPEARANCE.eyeColor;
    }
    return profile;
  }

  return createDefaultProfile();
}
