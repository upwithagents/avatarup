'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Object3D,
  type Texture,
} from 'three';
import type { AvatarProfile, SkinTextureRef } from '@avatarup/avatar-core';
import { MATERIAL_COLOR_SLOTS, resolveMorphInfluences } from './apply-profile';
import type { SkinTextureResolver } from './skin-texture';

// The authored skin material is fairly glossy (roughness 0.6) and reads
// waxy under studio lighting; matte it out. No roughnessMap is involved, so
// this floor doesn't fight the skin diffuse/color texture applied below.
const SKIN_ROUGHNESS_FLOOR = 0.82;

/** Finds every `MeshStandardMaterial` named "skin" in the scene (the glTF
 * material-naming contract — see docs/asset-pipeline.md). Usually one, but
 * traversal doesn't assume that. */
function collectSkinMaterials(scene: Object3D) {
  const materials: MeshStandardMaterial[] = [];
  scene.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of list) {
      if (material instanceof MeshStandardMaterial && material.name === 'skin') {
        materials.push(material);
      }
    }
  });
  return materials;
}

function clearSkinTexture(materials: MeshStandardMaterial[]) {
  for (const material of materials) {
    material.map = null;
    material.needsUpdate = true;
  }
}

export function AvatarModel({
  url,
  profile,
  resolveSkinTexture,
  onSkinTextureUnavailable,
}: {
  url: string;
  profile: AvatarProfile;
  /** Resolves a non-null `profile.appearance.skinTexture` to a loadable
   * image source. Omitted (or profile.appearance.skinTexture is null) ->
   * plain material.color, no map. See skin-texture.ts for the seam design. */
  resolveSkinTexture?: SkinTextureResolver;
  /** Called when a set skinTexture reference can't be resolved to an image
   * (e.g. a deleted/corrupt upload) so the host can clear it from the
   * profile it persists, instead of retrying forever. Pass a stable
   * (e.g. useCallback with a `[]` dep array, reading current profile/setter
   * via refs) function — it's intentionally left out of the loading
   * effect's deps below so an unrelated re-render (a morph tweak) doesn't
   * re-trigger a texture reload; a non-stable callback would go stale. */
  onSkinTextureUnavailable?: (ref: SkinTextureRef) => void;
}) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    // E2E hook: lets browser tests (apps/web/e2e/*) reach the loaded scene,
    // e.g. to set morph influences that have no UI slider yet.
    (window as unknown as Record<string, unknown>).__avatarupScene = scene;

    scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;

      if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
        const next = resolveMorphInfluences(
          obj.morphTargetDictionary,
          obj.morphTargetInfluences,
          profile.morphs
        );
        for (let i = 0; i < next.length; i++) obj.morphTargetInfluences[i] = next[i];
      }

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        const slot = MATERIAL_COLOR_SLOTS[material.name];
        if (slot) material.color = new Color(profile.appearance[slot]);
        if (material.name === 'skin') {
          material.roughness = Math.max(material.roughness, SKIN_ROUGHNESS_FLOOR);
        }
      }
    });
  }, [scene, profile]);

  // Separate effect, keyed only on the texture reference (not the whole
  // profile) so dragging a morph slider or tweaking a color doesn't re-fetch
  // or reload the skin texture.
  const skinTextureRef = profile.appearance.skinTexture;
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function applyTexture() {
      const materials = collectSkinMaterials(scene);
      const ref = skinTextureRef;

      if (!ref || !resolveSkinTexture) {
        clearSkinTexture(materials);
        return;
      }

      let source: string | Blob | null;
      try {
        source = await resolveSkinTexture(ref);
      } catch {
        source = null;
      }
      if (cancelled) return;

      if (!source) {
        clearSkinTexture(materials);
        onSkinTextureUnavailable?.(ref);
        return;
      }

      const url = typeof source === 'string' ? source : URL.createObjectURL(source);
      if (typeof source !== 'string') objectUrlRef.current = url;

      new TextureLoader().load(
        url,
        (texture: Texture) => {
          if (cancelled) {
            texture.dispose();
            return;
          }
          texture.colorSpace = SRGBColorSpace;
          // glTF's UV convention has +v pointing up; three.js image textures
          // default to flipY=true (image-space down). Presets/uploads here
          // are plain 2D images, not pre-flipped glTF assets, so this must
          // stay false to line up with the body mesh's TEXCOORD_0.
          texture.flipY = false;
          texture.needsUpdate = true;
          for (const material of materials) {
            material.map = texture;
            material.needsUpdate = true;
          }
        },
        undefined,
        () => {
          if (cancelled) return;
          clearSkinTexture(materials);
          onSkinTextureUnavailable?.(ref);
        }
      );
    }

    applyTexture();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, skinTextureRef, resolveSkinTexture]);

  return <primitive object={scene} />;
}
