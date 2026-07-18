'use client';

import { Canvas } from '@react-three/fiber';
import { Backdrop, CameraControls, ContactShadows, Environment } from '@react-three/drei';
import {
  Suspense,
  useCallback,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { Box3, Vector3 } from 'three';
import { withBasePath } from './base-path';
import { AvatarBoundsProvider } from './avatar-bounds-context';
import { computeViewPresets, type AvatarView, type LookAt } from './avatar-bounds';

export type { AvatarView } from './avatar-bounds';

/** Vendored studio HDRI (Poly Haven "Studio Small 08", CC0), served by the host app. */
const ENVIRONMENT_URL = withBasePath('/hdri/studio_small_08_1k.hdr');

/** Imperative handle exposed via the `viewRef` prop — no three.js types leak through it. */
export interface AvatarViewerHandle {
  /** Smoothly move the camera to a named preset. */
  goTo(view: AvatarView): void;
  /** Smoothly return the camera to its initial framing. */
  reset(): void;
}

const DEFAULT_VIEW: AvatarView = 'torso';

// Seeds the camera before any mesh has reported real bounds — R3F's Canvas
// needs a synchronous initial camera position, but the model loads
// asynchronously. Roughly an average adult human standing at the origin;
// replaced the instant the loaded model reports its actual bounding box.
const FALLBACK_BOX = new Box3(new Vector3(-0.3, 0, -0.2), new Vector3(0.3, 1.7, 0.2));

export function AvatarViewer({
  children,
  viewRef,
}: {
  children: ReactNode;
  /** Populated with `{ goTo, reset }` once the scene mounts; optional for callers that don't need camera navigation. */
  viewRef?: RefObject<AvatarViewerHandle | null>;
}) {
  const controlsRef = useRef<CameraControls | null>(null);
  const presetsRef = useRef<Record<AvatarView, LookAt>>(computeViewPresets(FALLBACK_BOX));

  const applyPreset = useCallback((view: AvatarView, animate: boolean) => {
    const preset = presetsRef.current[view];
    controlsRef.current?.setLookAt(...preset.position, ...preset.target, animate);
  }, []);

  // A `useEffect` in this component would run in the outer React tree,
  // which can fire before @react-three/fiber's own reconciler has mounted
  // CameraControls (its Canvas subtree renders on a separate root) — that
  // races and the initial setLookAt below is silently dropped. A ref
  // callback is invoked by whichever reconciler owns the instance, exactly
  // when it mounts, so it can't lose that race.
  const attachControls = useCallback(
    (instance: CameraControls | null) => {
      controlsRef.current = instance;
      if (instance) applyPreset(DEFAULT_VIEW, false);
    },
    [applyPreset]
  );

  // Fed to whatever model is rendered as `children`; recomputes the preset
  // table from the mesh's real bounds and snaps to it (no animation — this
  // is "get correctly framed on load", not a user-initiated move).
  const reportBounds = useCallback(
    (box: Box3) => {
      presetsRef.current = computeViewPresets(box);
      applyPreset(DEFAULT_VIEW, false);
    },
    [applyPreset]
  );

  useImperativeHandle(
    viewRef,
    () => ({
      goTo(view) {
        applyPreset(view, true);
      },
      reset() {
        applyPreset(DEFAULT_VIEW, true);
      },
    }),
    [applyPreset]
  );

  return (
    <Canvas camera={{ position: presetsRef.current[DEFAULT_VIEW].position, fov: 38 }}>
      <color attach="background" args={['#0e0e12']} />

      {/* Image-based lighting carries most of the illumination for soft,
          natural shading on skin. */}
      <Suspense fallback={null}>
        <Environment files={ENVIRONMENT_URL} environmentIntensity={0.9} />
      </Suspense>

      {/* Three-point accent rig on top of the env light: gentle warm key,
          cool fill, rim for silhouette separation. Deliberately no
          shadow-casting — grounding comes from ContactShadows only, so no
          hard body silhouette lands on the backdrop. */}
      <directionalLight color="#fff6ee" intensity={0.9} position={[2.2, 3.2, 2.4]} />
      <directionalLight color="#b9ccff" intensity={0.55} position={[-3, 1.6, 2.2]} />
      <directionalLight color="#dfe8ff" intensity={1.1} position={[-0.6, 2.6, -2.8]} />

      {/* Studio sweep behind the avatar; lit gradient instead of a black void. */}
      <Backdrop
        receiveShadow={false}
        floor={1.8}
        segments={24}
        scale={[12, 5, 4]}
        position={[0, -0.005, -1.6]}
      >
        <meshStandardMaterial color="#26262c" roughness={0.95} metalness={0} />
      </Backdrop>

      {/* Soft blob under the feet grounds the figure. */}
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.4}
        scale={3.5}
        blur={2.4}
        far={1.4}
        resolution={512}
      />

      <CameraControls
        ref={attachControls}
        makeDefault
        minDistance={0.6}
        maxDistance={4.5}
        maxPolarAngle={Math.PI * 0.55}
      />
      <AvatarBoundsProvider value={reportBounds}>{children}</AvatarBoundsProvider>
    </Canvas>
  );
}
