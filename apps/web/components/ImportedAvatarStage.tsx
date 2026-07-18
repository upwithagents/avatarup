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
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
    <div className="flex h-dvh flex-col bg-background">
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
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground">
            <h1 className="text-lg font-semibold text-foreground">Import your avatar</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Upload a MetaHuman .glb export (mesh, skeleton, and textures)
              to view it here.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-border bg-muted px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Upload avatar (.glb)
            </button>
            {/* Plain <a href> wouldn't pick up this build's static basePath
                (see next.config.ts) and would 404; next/link does. */}
            <Link href="/legacy" className="text-xs text-muted-foreground underline hover:text-muted-foreground">
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
                className="rounded-md border border-border bg-muted/80 px-3 py-1.5 text-sm text-foreground backdrop-blur transition-colors hover:bg-muted-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => viewRef.current?.reset()}
              className="rounded-md border border-border bg-muted/80 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-border bg-muted/80 px-3 py-1.5 text-sm text-foreground backdrop-blur transition-colors hover:bg-muted-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Replace avatar
            </button>
          </div>
        )}

        {importError && (
          <div
            role="alert"
            className="absolute right-4 top-4 max-w-xs rounded-md border border-danger bg-danger/10 px-3 py-2 text-xs text-danger backdrop-blur"
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
