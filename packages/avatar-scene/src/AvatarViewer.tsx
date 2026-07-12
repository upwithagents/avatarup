'use client';

import { Canvas } from '@react-three/fiber';
import { Backdrop, CameraControls, ContactShadows, Environment } from '@react-three/drei';
import { Suspense, useCallback, useImperativeHandle, useRef, type ReactNode, type RefObject } from 'react';

/** Vendored studio HDRI (Poly Haven "Studio Small 08", CC0), served by the host app. */
const ENVIRONMENT_URL = '/hdri/studio_small_08_1k.hdr';

/** Named camera presets a host app can navigate to via {@link AvatarViewerHandle}. */
export type AvatarView = 'face' | 'torso' | 'full';

/** Imperative handle exposed via the `viewRef` prop — no three.js types leak through it. */
export interface AvatarViewerHandle {
  /** Smoothly move the camera to a named preset. */
  goTo(view: AvatarView): void;
  /** Smoothly return the camera to its initial framing. */
  reset(): void;
}

interface LookAt {
  position: [number, number, number];
  target: [number, number, number];
}

/** Model bounds: feet at y≈0, hip line y≈0.95, torso center y≈1.15, head/face center y≈1.55–1.62, head top y≈1.67. */
const VIEW_PRESETS: Record<AvatarView, LookAt> = {
  face: { position: [0, 1.58, 0.75], target: [0, 1.58, 0] },
  torso: { position: [0, 1.47, 1.39], target: [0, 1.32, 0] },
  full: { position: [0, 1.3, 3.0], target: [0, 0.95, 0] },
};

const DEFAULT_VIEW: AvatarView = 'torso';

export function AvatarViewer({
  children,
  viewRef,
}: {
  children: ReactNode;
  /** Populated with `{ goTo, reset }` once the scene mounts; optional for callers that don't need camera navigation. */
  viewRef?: RefObject<AvatarViewerHandle | null>;
}) {
  const controlsRef = useRef<CameraControls | null>(null);

  // A `useEffect` in this component would run in the outer React tree, which
  // can fire before @react-three/fiber's own reconciler has mounted
  // CameraControls (its Canvas subtree renders on a separate root) — that
  // races and the initial setLookAt below is silently dropped. A ref
  // callback is invoked by whichever reconciler owns the instance, exactly
  // when it mounts, so it can't lose that race. Memoized so it isn't
  // re-invoked (and doesn't re-snap the camera) on every parent re-render.
  const attachControls = useCallback((instance: CameraControls | null) => {
    controlsRef.current = instance;
    if (instance) {
      const preset = VIEW_PRESETS[DEFAULT_VIEW];
      instance.setLookAt(...preset.position, ...preset.target, false);
    }
  }, []);

  useImperativeHandle(
    viewRef,
    () => ({
      goTo(view) {
        const preset = VIEW_PRESETS[view];
        controlsRef.current?.setLookAt(...preset.position, ...preset.target, true);
      },
      reset() {
        const preset = VIEW_PRESETS[DEFAULT_VIEW];
        controlsRef.current?.setLookAt(...preset.position, ...preset.target, true);
      },
    }),
    [],
  );

  return (
    <Canvas camera={{ position: VIEW_PRESETS[DEFAULT_VIEW].position, fov: 38 }}>
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
      {children}
    </Canvas>
  );
}
