'use client';

import { Canvas } from '@react-three/fiber';
import { Backdrop, ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Suspense, type ReactNode } from 'react';

/** Vendored studio HDRI (Poly Haven "Studio Small 08", CC0), served by the host app. */
const ENVIRONMENT_URL = '/hdri/studio_small_08_1k.hdr';

export function AvatarViewer({ children }: { children: ReactNode }) {
  return (
    <Canvas camera={{ position: [0, 1.55, 1.9], fov: 38 }}>
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

      <OrbitControls
        target={[0, 1.15, 0]}
        enableDamping
        makeDefault
        minDistance={0.6}
        maxDistance={4.5}
        maxPolarAngle={Math.PI * 0.55}
      />
      {children}
    </Canvas>
  );
}
