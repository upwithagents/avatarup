'use client';

import type { AvatarProfile } from '@avatarup/avatar-core';
import { COLOR_CONTROLS, MORPH_CONTROLS } from '@/lib/controls';

interface Props {
  profile: AvatarProfile;
  onChange: (profile: AvatarProfile) => void;
}

export function CustomizerPanel({ profile, onChange }: Props) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4 text-zinc-100">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Shape
        </h2>
        {MORPH_CONTROLS.map(({ morph, label }) => (
          <label key={morph} className="mb-3 block text-sm">
            <span className="mb-1 flex justify-between">
              {label}
              <span className="tabular-nums text-zinc-400">
                {(profile.morphs[morph] ?? 0).toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={profile.morphs[morph] ?? 0}
              onChange={(e) =>
                onChange({
                  ...profile,
                  morphs: { ...profile.morphs, [morph]: Number(e.target.value) },
                })
              }
              className="w-full"
            />
          </label>
        ))}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Appearance
        </h2>
        {COLOR_CONTROLS.map(({ key, label }) => (
          <label key={key} className="mb-3 flex items-center justify-between text-sm">
            {label}
            <input
              type="color"
              value={profile.appearance[key]}
              onChange={(e) =>
                onChange({
                  ...profile,
                  appearance: { ...profile.appearance, [key]: e.target.value },
                })
              }
            />
          </label>
        ))}
      </section>
    </aside>
  );
}
