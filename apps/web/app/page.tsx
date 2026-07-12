'use client';

import { AvatarStage } from '@/components/AvatarStage';
import { useAvatarProfile } from '@/lib/use-avatar-profile';

export default function Home() {
  const [profile, setProfile] = useAvatarProfile();
  return <AvatarStage profile={profile} onProfileChange={setProfile} />;
}
