'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createDefaultProfile,
  createProfileStore,
  type AvatarProfile,
} from '@avatarup/avatar-core';

const SAVE_DEBOUNCE_MS = 300;

export function useAvatarProfile(): [AvatarProfile, (p: AvatarProfile) => void] {
  // Start from defaults on both server and first client render (hydration
  // match), then load the stored profile after mount.
  const [profile, setProfile] = useState(createDefaultProfile);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    setProfile(createProfileStore(window.localStorage).load());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      createProfileStore(window.localStorage).save(profile);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [profile]);

  return [profile, setProfile];
}
