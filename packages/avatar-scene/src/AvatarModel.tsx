'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { Color, Mesh, MeshStandardMaterial } from 'three';
import type { AvatarProfile } from '@avatarup/avatar-core';
import { MATERIAL_COLOR_SLOTS, resolveMorphInfluences } from './apply-profile';

export function AvatarModel({ url, profile }: { url: string; profile: AvatarProfile }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
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
      }
    });
  }, [scene, profile]);

  return <primitive object={scene} />;
}
