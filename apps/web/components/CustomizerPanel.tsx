'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import {
  applyMorphPreset,
  validateSkinTextureUpload,
  withSkinTexture,
  type AvatarProfile,
} from '@avatarup/avatar-core';
import { COLOR_CONTROLS, GROUPED_CONTROLS } from '@/lib/controls';
import { GENDER_PRESETS, type Gender } from '@/lib/presets';
import { SKIN_TEXTURE_PRESETS } from '@/lib/skin-textures';
import { getTextureStore } from '@/lib/texture-store';

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleGenderClick(gender: Gender) {
    setActiveGender(gender);
    onChange(applyMorphPreset(profile, GENDER_PRESETS[gender]));
  }

  function deletePreviousUpload(prev: AvatarProfile['appearance']['skinTexture']) {
    if (prev?.kind === 'upload') {
      getTextureStore()
        .deleteTexture(prev.id)
        .catch(() => {});
    }
  }

  function handleSkinTextureNone() {
    setUploadError(null);
    deletePreviousUpload(profile.appearance.skinTexture);
    onChange(withSkinTexture(profile, null));
  }

  function handleSkinTexturePreset(id: string) {
    setUploadError(null);
    deletePreviousUpload(profile.appearance.skinTexture);
    onChange(withSkinTexture(profile, { kind: 'preset', id }));
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const result = validateSkinTextureUpload(file);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    setUploadError(null);

    const id = crypto.randomUUID();
    const prev = profile.appearance.skinTexture;
    try {
      await getTextureStore().saveTexture(id, file);
      deletePreviousUpload(prev);
      onChange(withSkinTexture(profile, { kind: 'upload', id }));
    } catch {
      setUploadError("Couldn't store the image — try a smaller file.");
    }
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

        <div className="mt-1">
          <span className="mb-2 block text-sm">Skin texture</span>
          <div role="group" aria-label="Skin texture" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={profile.appearance.skinTexture === null}
              onClick={handleSkinTextureNone}
              className={`flex h-10 w-10 items-center justify-center rounded-md border text-[10px] font-medium transition-colors ${
                profile.appearance.skinTexture === null
                  ? 'border-zinc-100 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              None
            </button>
            {SKIN_TEXTURE_PRESETS.map((preset) => {
              const pressed =
                profile.appearance.skinTexture?.kind === 'preset' &&
                profile.appearance.skinTexture.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => handleSkinTexturePreset(preset.id)}
                  title={preset.label}
                  className={`h-10 w-10 overflow-hidden rounded-md border-2 transition-colors ${
                    pressed ? 'border-zinc-100' : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            Upload…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          {uploadError && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {uploadError}
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}
