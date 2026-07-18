# AvatarUp — Living Avatar

The "looking good as a living avatar" expertise of the up ecosystem
(siblings: walletup, sheetup, homeup; shared agent core `upagent` planned).
Users see and interact with their avatar on PC and mobile web now; VR
(Quest 3 via WebXR) and agent-driven behavior are future phases.

## Ground rules

- **Independence from any employer.** This project and its data stay fully
  separate from any employer's accounts, infra, or tooling. Flag any
  leakage to the user.
- **GitHub:** `github.com/upwithagents/avatarup`. Contributions push under
  the repo-local `upwithagents` identity (already set in `.git/config`),
  never a contributor's personal or employer identity.
- No personal/identifying data committed. No secrets in the repo.

## Architecture (end picture)

1. **avatar-core** — framework-agnostic avatar profile (morph values,
   appearance incl. an optional skin-texture reference) + versioned
   serialization (v1 → v2 migration), plus an IndexedDB-backed texture
   store for user-uploaded skin textures. Also `avatar-file-store`, a
   separate IndexedDB-backed blob store for the single imported
   vendor-avatar file. The part a native app could reuse.
2. **avatar-scene** — React Three Fiber components rendering the profile
   onto a glTF humanoid (morph targets + material colors/textures), plus
   `ImportedAvatarModel` which renders a vendor-created glTF avatar as-is
   (no morph/material logic). The viewer (`AvatarViewer`) also owns HDRI
   environment lighting, an accent light rig, backdrop + contact shadows,
   and named camera view presets (Face/Torso/Full) driven imperatively
   via a handle — presets are now bounds-relative (`computeViewPresets`,
   computed from the loaded model's bounding box) rather than hardcoded
   coordinates, so they frame differently-proportioned avatars sensibly.
3. **apps/web** — Next.js app. The primary flow (`/`) lets a user import
   a vendor-created avatar (`.glb`/`.gltf`) and view it in the 3D scene
   with camera preset buttons. The original morph-based customizer (3D
   viewport + grouped slider/picker panel generated from
   `scripts/fixtures/controls-manifest.json`, profile persisted to
   localStorage) is preserved at `/legacy`.
4. Base mesh: MakeHuman-derived, authored via Blender+MPFB2, exported as
   glTF with 46 curated morph targets plus real eyes/hair assets and
   materials, uncompressed (~4.4 MB; compression deliberately deferred).
   Used by the legacy `/legacy` customizer. See `docs/asset-pipeline.md`
   (legacy/unmaintained).
5. Future: idle animation, physics, WebXR (Quest 3), non-humanoid rigs,
   upagent integration. Each is its own spec before implementation.

## Conventions

- Branches: `up/<max-3-word-kebab>`. Direct commits to `main` allowed for
  small work; larger work goes through branches.
- Stack: Next.js + TypeScript (strict) + Tailwind; three.js via
  @react-three/fiber; Vitest for unit tests; pnpm workspace,
  `@avatarup/*` package scope.
- Morph values clamp to [0,1]; avatar profile JSON is versioned.
- Roadmap + implementation plans are maintained outside this repo.

## Testing

- `pnpm test` — Vitest (avatar-core logic, scene helpers).
- `node apps/web/e2e/customizer-smoke.mjs` — browser smoke test of the
  primary import/view flow, against a running `pnpm dev` server.
- `node apps/web/e2e/legacy-smoke.mjs` — browser smoke test of the
  `/legacy` customizer (morphs, gender presets, skin textures).
