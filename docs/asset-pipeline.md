# Asset pipeline: base avatar mesh

How `apps/web/public/models/avatar-base.glb` is authored and regenerated.
The asset is fully scripted — no manual Blender GUI steps.

## Tools & versions

| Tool | Version | Notes |
| --- | --- | --- |
| Blender | 5.1.2 | on PATH as `blender`, used headless (`--background`) |
| MPFB2 extension | 2.0.16 (build 20260613) | installed from extensions.blender.org, extension id `mpfb` |
| Node.js | 22.x | for the inspector script |
| gltfpack | not used | see [Compression](#compression) |

## Authoring (Blender + MPFB2, fully scripted)

The whole asset is produced by `scripts/blender/make-avatar-base.py`, which
drives MPFB2's Python services headless:

1. `HumanService.create_human(...)` creates the MakeHuman hm08 basemesh at
   0.1 scale (MakeHuman decimeters → meters), feet on ground, default macro
   state (androgynous young adult, average muscle/weight/height).
2. The default macro shape keys are baked into the mesh
   (`TargetService.bake_targets`) so only our curated morphs are exported.
3. **Macro sliders** (feminine/masculine/muscular/heavyset/slender/tall/petite)
   are baked one shape key each: the script computes MPFB's macro target
   stack for the modified state vs the default state
   (`TargetService.calculate_target_stack_from_macro_info_dict`), loads the
   difference components as temporary weighted shape keys (weights can be
   negative), and collapses them into a single named key via Blender's
   "new shape from mix". This flattens MPFB's macro *combination system*
   into plain glTF-exportable morph targets.
4. **Detail sliders** are individual MakeHuman system targets shipped inside
   MPFB2 (`data/targets/**`), loaded via `TargetService.load_target`.
   Left-side-only targets (eye/cheek/ear) are mirrored to the right with
   `TargetService.symmetrize_shape_key` so one slider drives both sides.
5. **Eyes and hair placeholders** are extracted from the basemesh's helper
   geometry (`helper-l-eye`/`helper-r-eye` and `helper-hair` vertex groups).
   The long-hair helper is trimmed to a scalp cap (vertices above the brow
   line) and pushed 4 mm along normals to avoid z-fighting. Extraction
   happens *after* the shape keys are loaded and uses edit-mode deletion, so
   both meshes keep same-named shape keys — MakeHuman targets also displace
   helper vertices, which makes eyes/hair follow the head when body morphs
   (tall, masculine, ...) are applied at runtime. The scene applies morphs
   by name to every mesh, so they stay in sync automatically.
6. The default MPFB rig (`HumanService.add_builtin_rig(..., "default")`) is
   added with vertex weights — not needed by the current customizer but kept
   for future animation phases. Eyes/hair are parented to the armature (no
   skin weights; they are placeholder meshes).
7. Helper geometry is removed while preserving shape keys
   (`ExportService.bake_modifiers_remove_helpers` with `bake_masks=True`).
8. Plain Principled BSDF materials are created and assigned; the app
   recolors them at runtime by name.

## Export settings

`bpy.ops.export_scene.gltf` with: `export_format='GLB'`, `export_morph=True`,
`export_morph_normal=False` (halves morph payload; lighting difference is
negligible at these delta sizes), `export_animations=False`,
`export_skins=True`, `export_apply=False` (must stay off — applying modifiers
would discard shape keys).

## Compression

**None (deliberate).** The raw export is ~1.9 MB — well under the 10 MB
budget — because Blender writes morph targets as sparse accessors.
`gltfpack` was evaluated and rejected for now:

- with `-cc` (meshopt) the app would need `MeshoptDecoder` wired into the
  loader, which is out of scope here;
- without `-cc` (quantization only) the saving is small in absolute terms,
  and the `npm exec gltfpack` install footprint is ~680 MB, which this
  machine's disk cannot spare.

Revisit if the asset grows (textures, more morphs).

## Validation

```bash
node scripts/inspect-gltf.mjs apps/web/public/models/avatar-base.glb
```

Must print the 20 morph target names below on the `Body` mesh and materials
`skin`, `eyes`, `hair`. Then:

```bash
pnpm dev            # app on :3000 (or :3001 if busy)
node apps/web/e2e/customizer-smoke.mjs [http://localhost:3001]
```

## Material naming contract

`packages/avatar-scene` recolors materials by exact glTF material name
(`MATERIAL_COLOR_SLOTS`): `skin` (Body), `hair` (Hair cap), `eyes` (Eyes).
Any future asset revision must keep these names.

## Curated morph list

Morph values are [0, 1]; the model rests at 0 on all sliders.

| Morph target | What it does | Source |
| --- | --- | --- |
| `feminine` | full-body female shape | macro gender → 0.0 |
| `masculine` | full-body male shape | macro gender → 1.0 |
| `muscular` | muscle definition | macro muscle → 1.0 |
| `heavyset` | body fat up | macro weight → 1.0 |
| `slender` | body fat down | macro weight → 0.0 |
| `tall` | height up (~+0.7 m at 1.0) | macro height → 1.0 |
| `petite` | height down | macro height → 0.0 |
| `belly` | rounder stomach | `stomach-pregnant-incr` |
| `bust` | bust circumference | `measure-bust-circ-incr` |
| `buttocks` | buttocks volume | `buttocks-volume-incr` |
| `head-round` | rounder face shape | `head-round` |
| `jaw-width` | wider jaw | `chin-width-incr` |
| `chin-prominent` | more prominent chin | `chin-prominent-incr` |
| `nose-size` | bigger nose | `nose-volume-incr` |
| `nose-width` | wider nose | `nose-scale-horiz-incr` |
| `mouth-width` | wider mouth | `mouth-scale-horiz-incr` |
| `lip-fullness` | fuller lips | upper+lower lip volume combo |
| `eye-size` | bigger eyes | `l-eye-scale-incr`, symmetrized |
| `cheek-fullness` | fuller cheeks | `l-cheek-volume-incr`, symmetrized |
| `ear-size` | bigger ears | `l-ear-scale-incr`, symmetrized |

Macro sliders are deltas from the androgynous default, so e.g. `feminine`
and `masculine` at 1.0 simultaneously roughly cancel out. Because the base
is androgynous, macro deltas are the female/male average (about half the
strength of a single-gender MakeHuman slider) — subtle by design.

## Regenerating from scratch

```bash
# 1. One-time: install + enable the MPFB2 extension (headless)
blender --online-mode --command extension sync
blender --online-mode --command extension install mpfb --enable

# 2. Author + export (takes ~5 s)
blender --background --python scripts/blender/make-avatar-base.py -- \
    --out /tmp/avatar-base-raw.glb

# 3. Validate, then place
node scripts/inspect-gltf.mjs /tmp/avatar-base-raw.glb
cp /tmp/avatar-base-raw.glb apps/web/public/models/avatar-base.glb
```

To change the curated set, edit `MACRO_SLIDERS` / `DETAIL_SLIDERS` in
`scripts/blender/make-avatar-base.py` (available system target names live
under the MPFB2 extension's `data/targets/` directory), regenerate, and
update `MORPH_CONTROLS` in `apps/web/lib/controls.ts` to match.

## Gotchas

- **Two `next dev` instances of the same app** (stale `.next`) can make
  every route 404. If the customizer 404s, kill stray dev servers and
  `rm -rf apps/web/.next`.
- MPFB2's basemesh ships helper geometry; anything exported without
  `bake_modifiers_remove_helpers` will include invisible fitting meshes.
- Blender's glTF exporter silently drops shape keys if `export_apply=True`.
- MakeHuman targets index *all* basemesh vertices (body + helpers), so
  vertex-index-based operations (target loading, rig weight import,
  `symmetrize_shape_key`) must run **before** helper removal.
- `npm exec -y gltfpack` downloads ~680 MB into the npx cache.
