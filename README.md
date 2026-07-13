# AvatarUp

Your living avatar — see it, shape it, and eventually talk to it on PC,
mobile, and VR.

Part of the **up** ecosystem (walletup, sheetup, homeup, …), where each
project is an "expertise" that will plug into a shared agent core
(upagent). AvatarUp's expertise: looking good as a living avatar.

## Status

Beyond POC: a browser-based avatar customizer with a studio-lit 3D
viewport and a fuller customization panel.

- **Scene**: HDRI environment lighting, three-point accent rig, grounded
  backdrop + contact shadows, and camera view presets (Face / Torso /
  Full / Reset) navigable via on-screen buttons.
- **Avatar**: 46 morph targets (body, torso, head, face, eyes, nose,
  mouth), real MakeHuman-derived eyes and hair assets, and full-strength
  gender macros.
- **Panel**: a Female/Neutral/Male gender preset toggle, morph sliders
  grouped into collapsible sections, appearance color pickers, and skin
  texture presets + custom image upload (stored in IndexedDB).
- Profile persistence (`localStorage`) is versioned (v1 → v2) to carry
  the new skin-texture reference alongside morphs/colors.

Still a local dev app, not production-hardened. Known rough edges: the
default untextured face reads a bit uncanny without a skin texture
applied; the bundled skin textures are procedural placeholders, not
photographic; and eye-color tinting has limited effect since it
multiplies the whole eye texture (see `docs/asset-pipeline.md`).
Movement, physics, VR (Quest), and agent-driven behavior come in later
phases.

## Stack

pnpm monorepo:

- `apps/web` — Next.js + TypeScript + Tailwind customizer UI
- `packages/avatar-core` — framework-agnostic avatar profile model
- `packages/avatar-scene` — React Three Fiber viewer components

## Running

```bash
pnpm install
pnpm dev        # → http://localhost:3000
pnpm test       # Vitest unit tests
```
