'use client';

import { createContext, useContext } from 'react';
import type { Box3 } from 'three';

export type ReportAvatarBounds = (box: Box3) => void;

const AvatarBoundsContext = createContext<ReportAvatarBounds | null>(null);

export const AvatarBoundsProvider = AvatarBoundsContext.Provider;

/** Lets a model component rendered inside `<AvatarViewer>` report its
 * loaded mesh's world-space bounding box, so the viewer can frame camera
 * view presets relative to the mesh's actual size instead of a fixed
 * table. No-op outside an `AvatarViewer` (e.g. a component rendered in
 * isolation/tests). */
export function useReportAvatarBounds(): ReportAvatarBounds {
  const report = useContext(AvatarBoundsContext);
  return report ?? (() => {});
}
