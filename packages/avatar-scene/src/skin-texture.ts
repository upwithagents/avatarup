import type { SkinTextureRef } from '@avatarup/avatar-core';

/**
 * The seam between avatar-scene (owns all three.js texture application) and
 * a host app (owns where images actually live — bundled presets under a
 * public/ folder, uploads in a browser-side blob store, or something else
 * entirely on a future native host).
 *
 * Given a non-null `SkinTextureRef` from the profile, a host resolves it to
 * an actual loadable image: a URL string (presets) or a `Blob` (uploads —
 * AvatarModel turns it into an object URL and revokes it on cleanup/change).
 * Returning null means "unavailable" (e.g. a deleted/corrupt upload
 * record); AvatarModel then falls back to the flat material color, the same
 * as `skinTexture: null` in the profile.
 */
export type SkinTextureResolver = (ref: SkinTextureRef) => Promise<string | Blob | null>;
