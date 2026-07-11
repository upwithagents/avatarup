'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { ReactNode } from 'react';

export function AvatarViewer({ children }: { children: ReactNode }) {
  return (
    <Canvas camera={{ position: [0, 1.4, 2.6], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <OrbitControls target={[0, 1, 0]} enableDamping makeDefault />
      {children}
    </Canvas>
  );
}
