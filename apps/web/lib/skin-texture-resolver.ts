import type { SkinTextureResolver } from '@avatarup/avatar-scene';
import { SKIN_TEXTURE_PRESETS } from './skin-textures';
import { getTextureStore } from './texture-store';

/** Implements avatar-scene's `SkinTextureResolver` seam for this app: preset
 * ids map to bundled URLs, upload ids come back as a Blob from the
 * IndexedDB-backed texture store (null if missing/corrupt — AvatarModel
 * treats that as "no texture"). */
export const resolveSkinTexture: SkinTextureResolver = async (ref) => {
  if (ref.kind === 'preset') {
    return SKIN_TEXTURE_PRESETS.find((p) => p.id === ref.id)?.url ?? null;
  }
  return getTextureStore().loadTexture(ref.id);
};
