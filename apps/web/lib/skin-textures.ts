import { withBasePath } from '@avatarup/avatar-scene';

// Bundled skin-texture presets. See
// apps/web/public/textures/skin/SOURCES.md for provenance/regeneration.
export interface SkinTexturePreset {
  id: string;
  label: string;
  url: string;
}

export const SKIN_TEXTURE_PRESETS: SkinTexturePreset[] = [
  { id: 'fair', label: 'Fair', url: withBasePath('/textures/skin/fair.png') },
  { id: 'medium', label: 'Medium', url: withBasePath('/textures/skin/medium.png') },
  { id: 'deep', label: 'Deep', url: withBasePath('/textures/skin/deep.png') },
];
