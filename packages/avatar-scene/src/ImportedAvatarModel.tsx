'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { Box3 } from 'three';
import { useReportAvatarBounds } from './avatar-bounds-context';

/** Renders an imported (vendor-created) avatar as-is: no morph-target
 * application, no material-name-based tinting — the mesh already comes
 * fully shaped and textured. See docs/imported-avatar-format.md. */
export function ImportedAvatarModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const reportBounds = useReportAvatarBounds();

  useEffect(() => {
    reportBounds(new Box3().setFromObject(scene));
  }, [scene, reportBounds]);

  // Frees drei's internal cache entry for this object URL once it's no
  // longer used (e.g. the user replaces their avatar) — object URLs are
  // unique per blob, so a stale cache entry would just accumulate.
  useEffect(() => {
    return () => {
      useGLTF.clear(url);
    };
  }, [url]);

  return <primitive object={scene} />;
}
