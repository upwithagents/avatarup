'use client';

import { Component, Suspense, useCallback, useRef, type ReactNode } from 'react';
import { withSkinTexture, type AvatarProfile, type SkinTextureRef } from '@avatarup/avatar-core';
import {
  AvatarModel,
  AvatarViewer,
  type AvatarView,
  type AvatarViewerHandle,
} from '@avatarup/avatar-scene';
import { CustomizerPanel } from '@/components/CustomizerPanel';
import { MODEL_URL } from '@/lib/controls';
import { resolveSkinTexture } from '@/lib/skin-texture-resolver';

const VIEW_BUTTONS: { view: AvatarView; label: string }[] = [
  { view: 'face', label: 'Face' },
  { view: 'torso', label: 'Torso' },
  { view: 'full', label: 'Full' },
];

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
  const viewRef = useRef<AvatarViewerHandle>(null);

  // Refs so the callback below can stay referentially stable (see the
  // stability note on AvatarModel's onSkinTextureUnavailable prop) while
  // still reading the latest profile/setter when it actually fires.
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onProfileChangeRef = useRef(onProfileChange);
  onProfileChangeRef.current = onProfileChange;

  const handleSkinTextureUnavailable = useCallback((ref: SkinTextureRef) => {
    const current = profileRef.current.appearance.skinTexture;
    // Only clear if this is still the reference that failed to resolve —
    // the user may have already picked something else in the meantime.
    if (current?.kind === ref.kind && current.id === ref.id) {
      onProfileChangeRef.current(withSkinTexture(profileRef.current, null));
    }
  }, []);

  return (
    <div className="flex h-dvh bg-zinc-950">
      <main className="relative min-w-0 flex-1">
        <ModelErrorBoundary>
          <AvatarViewer viewRef={viewRef}>
            <Suspense fallback={null}>
              <AvatarModel
                url={MODEL_URL}
                profile={profile}
                resolveSkinTexture={resolveSkinTexture}
                onSkinTextureUnavailable={handleSkinTextureUnavailable}
              />
            </Suspense>
          </AvatarViewer>
        </ModelErrorBoundary>
        <div className="absolute bottom-4 left-4 flex gap-2">
          {VIEW_BUTTONS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              onClick={() => viewRef.current?.goTo(view)}
              className="rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-100 backdrop-blur transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => viewRef.current?.reset()}
            className="rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-400 backdrop-blur transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            Reset
          </button>
        </div>
      </main>
      <CustomizerPanel profile={profile} onChange={onProfileChange} />
    </div>
  );
}
