<img src="docs/icon.svg" width="56" align="left" alt="" />

# AvatarUp

Your living avatar — see it, shape it, and eventually talk to it on PC,
mobile, and VR. Part of the **up** ecosystem (walletup, sheetup, homeup,
…), each an "expertise" that plugs into the shared agent core (upagent).

<br clear="left"/>

## Status

Upload a vendor-created MetaHuman avatar (`.glb`/`.gltf`) and view it in a
studio-lit 3D scene with camera presets (Face/Torso/Full) computed from
the model's own bounding box. The original morph-based customizer
(MakeHuman/Blender base mesh, sliders, skin textures) still lives at
`/legacy`. Still local-only, pre-production — movement, physics, VR
(Quest), and agent-driven behavior are later phases.

## Stack

pnpm monorepo: `apps/web` (Next.js customizer UI), `packages/avatar-core`
(avatar profile model), `packages/avatar-scene` (React Three Fiber viewer).

## Running

```bash
pnpm install
pnpm dev        # → http://localhost:3000
pnpm test       # Vitest unit tests
```
