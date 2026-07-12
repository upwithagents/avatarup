'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createDefaultProfile,
  createProfileStore,
  type AvatarProfile,
} from '@avatarup/avatar-core';

const SAVE_DEBOUNCE_MS = 300;

interface ProfileState {
  profile: AvatarProfile;
  hydrated: boolean;
}

export function useAvatarProfile(): [AvatarProfile, (p: AvatarProfile) => void] {
  // Defaults on both server and first client render (hydration match);
  // the stored profile is applied after mount, in the same state update
  // that marks hydration complete — so the save effect below can never
  // schedule a save of the pre-load default profile.
  const [state, setState] = useState<ProfileState>(() => ({
    profile: createDefaultProfile(),
    hydrated: false,
  }));

  useEffect(() => {
    setState({
      profile: createProfileStore(window.localStorage).load(),
      hydrated: true,
    });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const timer = setTimeout(() => {
      createProfileStore(window.localStorage).save(state.profile);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const setProfile = useCallback(
    (profile: AvatarProfile) => setState({ profile, hydrated: true }),
    []
  );

  return [state.profile, setProfile];
}
