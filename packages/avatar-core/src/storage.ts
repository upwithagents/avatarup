import {
  PROFILE_STORAGE_KEY,
  deserializeProfile,
  serializeProfile,
  type AvatarProfile,
} from './profile';

export interface ProfileStore {
  load(): AvatarProfile;
  save(profile: AvatarProfile): void;
}

export function createProfileStore(
  storage: Pick<Storage, 'getItem' | 'setItem'>
): ProfileStore {
  return {
    load() {
      return deserializeProfile(storage.getItem(PROFILE_STORAGE_KEY));
    },
    save(profile) {
      storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(profile));
    },
  };
}
