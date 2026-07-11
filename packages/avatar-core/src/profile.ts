export interface AvatarAppearance {
  skinColor: string;
  hairColor: string;
  eyeColor: string;
}

export interface AvatarProfile {
  version: 1;
  /** morph target name -> influence, always within [0, 1] */
  morphs: Record<string, number>;
  appearance: AvatarAppearance;
}

export const PROFILE_STORAGE_KEY = 'avatarup.profile.v1';

const DEFAULT_APPEARANCE: AvatarAppearance = {
  skinColor: '#c68863',
  hairColor: '#3b2f2f',
  eyeColor: '#4a6c8c',
};

export function createDefaultProfile(): AvatarProfile {
  return {
    version: 1,
    morphs: {},
    appearance: { ...DEFAULT_APPEARANCE },
  };
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function serializeProfile(profile: AvatarProfile): string {
  return JSON.stringify(profile);
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
  if (candidate.version !== 1) return createDefaultProfile();

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
