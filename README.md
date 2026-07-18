# AvatarUp

Your living avatar — see it, shape it, and eventually talk to it on PC,
mobile, and VR.

Part of the **up** ecosystem (walletup, sheetup, homeup, …), where each
project is an "expertise" that will plug into a shared agent core
(upagent). AvatarUp's expertise: looking good as a living avatar.

## Status

Pivoted from an in-house morph-based customizer to importing a
vendor-created avatar: the primary flow at `/` lets you upload a
full-body MetaHuman avatar (authored in Unreal Engine's MetaHuman Creator
and exported to glTF/.glb — mesh, skeleton, and textures) and view it in
a studio-lit 3D scene.

- **Import**: upload a `.glb`/`.gltf` file (validated for extension and
  size, then a real parse), persisted in IndexedDB via
  `avatar-file-store` so it survives a reload.
- **Scene**: HDRI environment lighting, three-point accent rig, grounded
  backdrop + contact shadows, and camera view presets (Face / Torso /
  Full / Reset) — now computed from the loaded avatar's actual bounding
  box (`computeViewPresets`) instead of hardcoded coordinates, so
  differently-proportioned imports still frame sensibly.
- **Rendering**: the imported mesh is rendered as-is — no morph targets,
  no material-name-based tinting, since a vendor export already arrives
  fully shaped and textured.
- **Hair caveat**: MetaHuman's strand-based (groom) hair doesn't export
  to glTF, so a real MetaHuman export needs a preset/fallback hairstyle
  chosen at export time rather than the original groom.
- The original morph-based customizer (MakeHuman/Blender base mesh,
  gender preset toggle, grouped morph sliders, skin texture
  presets/upload) still works and is preserved at `/legacy` — see
  `docs/asset-pipeline.md` (now legacy/unmaintained).

**Placeholder notice:** the avatar fixture currently checked in for
tests/dev (`apps/web/e2e/fixtures/sample-imported-avatar.glb`) is a
temporary stand-in copied from the old customizer's test asset, not a
real MetaHuman export — producing one requires the repo owner to author
it manually in Unreal Engine, which hasn't happened yet. The import/view
pipeline described above is built and tested against that placeholder;
it has not yet been exercised against a real MetaHuman asset.

Still a local dev app, not production-hardened. Movement, physics, VR
(Quest), and agent-driven behavior come in later phases.

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
