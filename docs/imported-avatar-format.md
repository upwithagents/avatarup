# Imported avatar format contract

**Status: placeholder / TBD.** This documents the format the import/view
pipeline (`ImportedAvatarModel`, `computeViewPresets`) currently assumes
for an uploaded avatar glTF. It is **not written against a real MetaHuman
export** — none exists in this repo yet. Treat every assumption below as
provisional until a real export is validated against it.

## Scope

The contract described here is **vendor-agnostic**: it's what the render
and camera-framing code needs from *any* uploaded avatar glTF/GLB, not
specifically a MetaHuman one. MetaHuman is the vendor currently targeted
(see `README.md`), but nothing in `ImportedAvatarModel` or
`computeViewPresets` checks for MetaHuman-specific structure — a
well-formed export from a different tool that meets the same orientation
and size assumptions should work the same way.

## Orientation assumptions

The pipeline assumes an uploaded avatar is:

- **Y-up**, matching three.js/glTF convention.
- **Upright** — standing pose, feet at the low end of the bounding box,
  head at the high end.
- **Roughly centered on X/Z at the origin.**

That last assumption is load-bearing in `packages/avatar-scene/src/avatar-bounds.ts`:
`computeViewPresets` hardcodes `position[0] = 0` and `target.x = 0`/`target.z = 0`
for every camera preset, deriving only the Y (height) axis from the
mesh's actual bounding box. If a real export isn't centered on X/Z,
camera framing will look off-center, and either the loader will need to
re-center the mesh before it's added to the scene, or this file's
assumptions (and `computeViewPresets`) will need to change to derive the
X/Z origin from the bounding box too.

## Camera preset fractions

The Face/Torso/Full camera presets are derived as fractions of the
mesh's bounding-box height, not hardcoded coordinates — see the
derivation comment above `PRESET_FRACTIONS` in
`packages/avatar-scene/src/avatar-bounds.ts` for where those fractions
came from. That comment is the source of truth; don't duplicate the
numbers here. Re-tune `PRESET_FRACTIONS` if framing looks off once a real
avatar export is loaded — verify visually (e.g. via
`apps/web/e2e/screenshot.mjs`) rather than guessing.

## Hair/groom caveat (MetaHuman-specific)

MetaHuman's strand-based ("groom") hair does not export to glTF. A real
MetaHuman export will need a preset/fallback hairstyle chosen at export
time instead of the original groom — see the placeholder notice in
`README.md`. This is specific to MetaHuman as a vendor, not a general
constraint of the import pipeline.

## Current status: placeholder fixture

`apps/web/e2e/fixtures/sample-imported-avatar.glb` is a **temporary
placeholder** — a copy of the old customizer POC's
`scripts/fixtures/test-avatar.glb` — not a real MetaHuman export. The
repo owner still needs to author a real MetaHuman avatar manually in
Unreal Engine (MetaHuman Creator) and export it to glTF; that hasn't
happened yet (see `README.md`'s placeholder notice for the handoff
process). The import/view pipeline is built and tested against the
placeholder only.

Once a real MetaHuman export exists, this doc should be updated with its
actual findings — mesh/material/morph-target structure, real file size,
and any glTF extensions it uses — the same way this project's earlier,
now-superseded MetaPerson-targeted plan characterized its own test export
before the rest of the pipeline depended on it. Don't invent details
about a MetaHuman export ahead of that; everything above is a contract
the code expects, not a description of a file that exists.

## Expected file size

No fixed expectation yet — kept loose deliberately. The app currently
enforces a 50 MB upload cap (`MAX_AVATAR_UPLOAD_BYTES` in
`packages/avatar-core/src/avatar-file-store.ts`). A real MetaHuman
export with 4K/8K textures could plausibly approach or exceed that cap;
revisit the limit once a real file's size is known.
