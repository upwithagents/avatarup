'use client';

import { useState } from 'react';
import { applyMorphPreset, type AvatarProfile } from '@avatarup/avatar-core';
import { COLOR_CONTROLS, GROUPED_CONTROLS } from '@/lib/controls';
import { GENDER_PRESETS, type Gender } from '@/lib/presets';

interface Props {
  profile: AvatarProfile;
  onChange: (profile: AvatarProfile) => void;
}

const GENDER_OPTIONS: { gender: Gender; label: string }[] = [
  { gender: 'female', label: 'Female' },
  { gender: 'neutral', label: 'Neutral' },
  { gender: 'male', label: 'Male' },
];

export function CustomizerPanel({ profile, onChange }: Props) {
  // Which preset was last clicked, purely for highlighting the segmented
  // control — a preset only overwrites a handful of morphs, so this is not
  // derived from profile.morphs (the user may have since tweaked one of them).
  const [activeGender, setActiveGender] = useState<Gender | null>(null);

  function handleGenderClick(gender: Gender) {
    setActiveGender(gender);
    onChange(applyMorphPreset(profile, GENDER_PRESETS[gender]));
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4 text-zinc-100">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Gender
        </h2>
        <div
          role="group"
          aria-label="Gender preset"
          className="flex overflow-hidden rounded-md border border-zinc-700"
        >
          {GENDER_OPTIONS.map(({ gender, label }, i) => (
            <button
              key={gender}
              type="button"
              aria-pressed={activeGender === gender}
              onClick={() => handleGenderClick(gender)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                i > 0 ? 'border-l border-zinc-700' : ''
              } ${
                activeGender === gender
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Shape
        </h2>
        {GROUPED_CONTROLS.map(({ group, controls }) => (
          <details key={group} open={group === 'Body'} className="mb-2">
            <summary className="cursor-pointer select-none py-1.5 text-sm font-semibold text-zinc-200">
              {group}
            </summary>
            <div className="pt-1 pl-1">
              {controls.map(({ morph, label }) => (
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
            </div>
          </details>
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
