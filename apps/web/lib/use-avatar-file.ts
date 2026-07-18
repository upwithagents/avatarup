'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAvatarFileStore,
  openAvatarFileDb,
  validateAvatarUpload,
} from '@avatarup/avatar-core';

export type AvatarFileStatus = 'loading' | 'empty' | 'ready';

export interface UseAvatarFileResult {
  /** 'loading' only until the initial IndexedDB read resolves. */
  status: AvatarFileStatus;
  /** Object URL for the current avatar's blob; set only when status is 'ready'. */
  objectUrl: string | null;
  /** Message from the most recently failed import attempt, if any —
   * independent of `status`, so a failed re-import doesn't blank out an
   * already-showing avatar. */
  importError: string | null;
  importFile(file: File): Promise<void>;
}

const store = createAvatarFileStore(openAvatarFileDb());

export function useAvatarFile(): UseAvatarFileResult {
  const [status, setStatus] = useState<AvatarFileStatus>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const applyBlob = useCallback((blob: Blob | null) => {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    if (blob) {
      const url = URL.createObjectURL(blob);
      currentUrlRef.current = url;
      setObjectUrl(url);
      setStatus('ready');
    } else {
      currentUrlRef.current = null;
      setObjectUrl(null);
      setStatus('empty');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    store.loadAvatar().then((blob) => {
      if (!cancelled) applyBlob(blob);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  const importFile = useCallback(
    async (file: File) => {
      const validation = validateAvatarUpload(file);
      if (!validation.ok) {
        setImportError(validation.error);
        return;
      }

      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        setImportError('Could not read that file — please try again.');
        return;
      }

      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        // Parsed once here purely to validate the file is real glTF before
        // persisting anything; the render path (ImportedAvatarModel) parses
        // it again independently via drei's useGLTF. Simpler than plumbing
        // a pre-parsed scene through, and this only runs on import, not on
        // every render.
        await new GLTFLoader().parseAsync(buffer, '');
      } catch {
        setImportError('That file is not a valid glTF/GLB avatar.');
        return;
      }

      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      try {
        await store.saveAvatar(blob);
      } catch {
        setImportError(
          "Couldn't save your avatar — try a smaller file or check your browser's storage settings."
        );
        return;
      }
      setImportError(null);
      applyBlob(blob);
    },
    [applyBlob]
  );

  return { status, objectUrl, importError, importFile };
}
