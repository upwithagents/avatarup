'use client';

import { Component, Suspense, type ReactNode } from 'react';
import type { AvatarProfile } from '@avatarup/avatar-core';
import { AvatarModel, AvatarViewer } from '@avatarup/avatar-scene';
import { CustomizerPanel } from '@/components/CustomizerPanel';
import { MODEL_URL } from '@/lib/controls';

class ModelErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
          Could not load the avatar model. Check that the model file exists
          and your browser supports WebGL.
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  profile: AvatarProfile;
  onProfileChange: (profile: AvatarProfile) => void;
}

export function AvatarStage({ profile, onProfileChange }: Props) {
  return (
    <div className="flex h-dvh bg-zinc-950">
      <main className="relative min-w-0 flex-1">
        <ModelErrorBoundary>
          <AvatarViewer>
            <Suspense fallback={null}>
              <AvatarModel url={MODEL_URL} profile={profile} />
            </Suspense>
          </AvatarViewer>
        </ModelErrorBoundary>
      </main>
      <CustomizerPanel profile={profile} onChange={onProfileChange} />
    </div>
  );
}
