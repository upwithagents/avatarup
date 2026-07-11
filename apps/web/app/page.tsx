'use client';

import { useState } from 'react';
import { createDefaultProfile } from '@avatarup/avatar-core';
import { AvatarStage } from '@/components/AvatarStage';

export default function Home() {
  const [profile, setProfile] = useState(createDefaultProfile);
  return <AvatarStage profile={profile} onProfileChange={setProfile} />;
}
