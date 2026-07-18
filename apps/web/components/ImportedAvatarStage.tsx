'use client';

import { Component, Suspense, useCallback, useRef, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AvatarViewer,
  ImportedAvatarModel,
  type AvatarView,
  type AvatarViewerHandle,
} from '@avatarup/avatar-scene';
import { useAvatarFile } from '@/lib/use-avatar-file';

const VIEW_BUTTONS: { view: AvatarView; label: string }[] = [
  { view: 'face', label: 'Face' },
  { view: 'torso', label: 'Torso' },
  { view: 'full', label: 'Full' },
];

class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
          Could not load this avatar file. Check that your browser supports
          WebGL, then try importing again.
        </div>
      );
    }
    return this.props.children;
  }
}

export function ImportedAvatarStage() {
  const { status, objectUrl, importError, importFile } = useAvatarFile();
  const viewRef = useRef<AvatarViewerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) importFile(file);
    },
    [importFile]
  );

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <main className="relative min-w-0 flex-1">
        {status === 'ready' && objectUrl ? (
          // Remounting on a new objectUrl clears any previous load-error
          // state after a successful replace.
          <ModelErrorBoundary key={objectUrl}>
            <AvatarViewer viewRef={viewRef}>
              <Suspense fallback={null}>
                <ImportedAvatarModel url={objectUrl} />
              </Suspense>
            </AvatarViewer>
          </ModelErrorBoundary>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-zinc-300">
            <h1 className="text-lg font-semibold text-zinc-100">Import your avatar</h1>
            <p className="max-w-md text-sm text-zinc-400">
              Upload a MetaHuman .glb export (mesh, skeleton, and textures)
              to view it here.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              Upload avatar (.glb)
            </button>
            {/* Plain <a href> wouldn't pick up this build's static basePath
                (see next.config.ts) and would 404; next/link does. */}
            <Link href="/legacy" className="text-xs text-zinc-500 underline hover:text-zinc-400">
              Looking for the old sandbox?
            </Link>
          </div>
        )}

        {status === 'ready' && (
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-100 backdrop-blur transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              Replace avatar
            </button>
          </div>
        )}

        {importError && (
          <div
            role="alert"
            className="absolute right-4 top-4 max-w-xs rounded-md border border-red-800 bg-red-950/90 px-3 py-2 text-xs text-red-200 backdrop-blur"
          >
            {importError}
          </div>
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
