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

   **Full-strength gender.** The MPFB gender macro is a single
   female(0)↔male(1) interpolation segment, so the `gender: 0.0`/`1.0`
   deltas from the 0.5 default already carry the full single-gender target
   weight (`universal-female-young-…` goes 0.5 → 0.99, the male counterpart
   0.5 → 0). What made `feminine` read weak was the *breast* macro:
   MPFB excludes all `breast/*` targets when cupsize/firmness sit at the
   default 0.5/0.5 (`averagecup-averagefirmness` is the forbidden neutral
   combination), so a pure gender delta stays flat-chested. `feminine` is
   therefore baked from `{gender: 0.0, cupsize: 0.75}`, which resolves to
   `breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness`
   at ~0.49 on top of the full female body targets.
4. **Detail sliders** are individual MakeHuman system targets shipped inside
   MPFB2 (`data/targets/**`), loaded via `TargetService.load_target`.
   Bilateral features (eyes, cheeks, ears, arms, legs, hands, feet) list
   both `l-`/`r-` targets in one combo so a single slider drives both sides.
5. **Eyes and hair** are real MakeHuman assets vendored under
   `scripts/blender/assets/` (see [Asset sources & licenses](#asset-sources--licenses)),
   loaded with `HumanService.add_mhclo_asset` (`material_type="NONE"`), which
   imports the mesh, fits it to the basemesh via the mhclo vertex mapping
   (every asset vertex is bound to three body vertices + offset) and rigs it.
   Then, for **each curated morph**, the script sets that shape key to 1.0 on
   the body, refits the asset (`ClothesService.fit_clothes_to_human`), and
   stores the fitted positions as a same-named shape key on the asset —
   per-vertex deltas under 1 µm are snapped to the basis so unrelated morphs
   export as (nearly) empty sparse accessors. The scene applies morph values
   by name to every mesh, so eyes and hair track the head automatically
   (eye-size, eye-spacing, feminine, tall, … all verified visually).
   Fitting references basemesh vertex indices *including helpers*, so all of
   this runs **before** helper removal.
6. The default MPFB rig (`HumanService.add_builtin_rig(..., "default")`) is
   added with vertex weights — not needed by the current customizer but kept
   for future animation phases. Eyes/hair get interpolated weights via
   `ClothesService.set_up_rigging`.
7. Helper geometry is removed while preserving shape keys
   (`ExportService.bake_modifiers_remove_helpers` with `bake_masks=True`).
8. Materials are created and assigned:
   - `skin`: plain Principled BSDF (recolored at runtime by name).
   - `eyes`: Principled BSDF + `brown_eye.png` (downscaled to 512²,
     packed). Texture alpha goes through a `Math:Round` node into the BSDF
     Alpha input, which the glTF exporter emits as **alphaMode MASK** —
     the eyeball mesh has an outer cornea layer whose UV region is fully
     transparent; without alpha it renders as an opaque shell hiding the
     iris, and with BLEND it would suffer three.js transparency sorting
     (eyes drawing over hair).
   - `hair`: Principled BSDF + `short02_diffuse.png` (downscaled to 1024²,
     packed), texture alpha straight into BSDF Alpha → **alphaMode BLEND**
     for soft strand edges.
9. The script writes `scripts/fixtures/controls-manifest.json` —
   `[{ group, morph, label }]` for every curated morph — and fails the build
   if the manifest and the exported shape keys ever drift apart. The UI
   consumes this file, so slider lists can't drift from the asset.

## Export settings

`bpy.ops.export_scene.gltf` with: `export_format='GLB'`, `export_morph=True`,
`export_morph_normal=False` (halves morph payload; lighting difference is
negligible at these delta sizes), `export_animations=False`,
`export_skins=True`, `export_apply=False` (must stay off — applying modifiers
would discard shape keys).

## Asset sources & licenses

Both assets are **CC0 1.0** (public domain dedication) from the MakeHuman
project and are vendored (mesh + material + texture) under
`scripts/blender/assets/` so the pipeline runs offline and reproducibly.
No attribution is legally required; sources kept here for provenance:

| Asset | Files | Source (CC0) |
| --- | --- | --- |
| Eyeballs ("HighPolyEyes") | `assets/eyes/high-poly/high-poly.{mhclo,obj}`, `assets/eyes/materials/brown.mhmat`, `brown_eye.png` | [makehumancommunity/makehuman](https://github.com/makehumancommunity/makehuman) `makehuman/data/eyes/` (assets released CC0 Sept 2020 by Data Collection AB, Joel Palmius, Jonas Hauquier) |
| Hair ("short02") | `assets/hair/short02.{mhclo,mhmat,obj}`, `short02_diffuse.png` | [makehumancommunity/makehuman-assets](https://github.com/makehumancommunity/makehuman-assets) `base/hair/short02/` (repo LICENSE.txt = CC0 1.0) |

Alternative hairstyles evaluated: `bob02` (nice layered bob, but its fringe
covers one eye and exposes transparent-vs-transparent draw-order artifacts
with the eyes). The repo has ~10 CC0 styles (afro01, bob01/02, braid01,
long01, ponytail01, short01–04) if we add hairstyle selection later.

## Compression

**None (deliberate).** The raw export is ~4.4 MB — under the 10 MB budget.
Morph targets export as sparse accessors; the two packed PNG textures
(hair 1024², eyes 512²) account for ~1.5 MB. `gltfpack` was evaluated and
rejected earlier (needs `MeshoptDecoder` wiring and a ~680 MB npx install).
Revisit if the asset grows further.

## Validation

```bash
node scripts/inspect-gltf.mjs apps/web/public/models/avatar-base.glb
```

Must print the 46 morph target names below on the `Body`, `Eyes` and `Hair`
meshes (all three carry the same list) and materials `skin`, `eyes`, `hair`.
Then:

```bash
pnpm dev            # app on :3000 (or :3001 if busy)
node apps/web/e2e/customizer-smoke.mjs [http://localhost:3001]
```

For visual checks of morphs that have no UI slider yet:

```bash
node apps/web/e2e/screenshot.mjs /tmp/shots http://localhost:3000 Face \
    --morph feminine=1 --morph eye-size=1 --name check.png
```

## Material naming contract

`packages/avatar-scene` recolors materials by exact glTF material name
(`MATERIAL_COLOR_SLOTS`): `skin` (Body), `hair` (Hair), `eyes` (Eyes).
Any future asset revision must keep these names.

**Tinting caveat:** `eyes` and `hair` are now textured; `material.color`
*multiplies* the texture, so tints darken/colorize the whole map. For eyes
this means a saturated color tints the white sclera too — the default
profile eye color is therefore near-neutral (`#f2ece4`), and eye-color
tinting has limited effect until iris-only tinting exists (future task).

## Curated morph list (46)

Morph values are [0, 1]; the model rests at 0 on all sliders. The full
`group`/`morph`/`label` table lives in `scripts/fixtures/controls-manifest.json`
(generated — regenerating the asset rewrites it). Summary by group:

| Group | Morphs |
| --- | --- |
| Body | `feminine`, `masculine`, `muscular`, `heavyset`, `slender`, `tall`, `petite`, `arms-thickness`, `legs-thickness`, `hands-size`, `feet-size` |
| Torso | `belly`, `bust`, `buttocks`, `shoulders-width`, `waist-narrow`, `hips-width`, `torso-v-shape`, `neck-thickness`, `neck-length` |
| Head | `head-round`, `face-oval`, `face-square`, `forehead-height`, `temples-width`, `ear-size` |
| Face | `jaw-width`, `chin-prominent`, `chin-height`, `cheek-fullness`, `cheekbones`, `brow-height`, `brow-angle` |
| Eyes | `eye-size`, `eye-spacing`, `eye-tilt`, `eyelid-height` |
| Nose | `nose-size`, `nose-width`, `nose-length`, `nose-tip-up`, `nose-hump`, `nostril-flare` |
| Mouth | `mouth-width`, `lip-fullness`, `mouth-corners-up` |

The 20 morphs that predate asset v2 keep their exact names, so profiles and
the current `apps/web/lib/controls.ts` list stay valid. Macro sliders are
deltas from the androgynous default; `feminine: 1` reaches MakeHuman's full
female endpoint (plus a maxcup breast component) and `masculine: 1` the full
male endpoint, so setting both to 1.0 roughly cancels out.

## Regenerating from scratch

```bash
# 1. One-time: install + enable the MPFB2 extension (headless)
blender --online-mode --command extension sync
blender --online-mode --command extension install mpfb --enable

# 2. Author + export (takes ~10 s); also rewrites
#    scripts/fixtures/controls-manifest.json
blender --background --python scripts/blender/make-avatar-base.py -- \
    --out /tmp/avatar-base-raw.glb

# 3. Validate, then place
node scripts/inspect-gltf.mjs /tmp/avatar-base-raw.glb
cp /tmp/avatar-base-raw.glb apps/web/public/models/avatar-base.glb
```

To change the curated set, edit `MACRO_SLIDERS` / `DETAIL_SLIDERS` in
`scripts/blender/make-avatar-base.py` (available system target names live
under the MPFB2 extension's `data/targets/` directory) and regenerate — the
manifest updates itself and the script errors out on any manifest/shape-key
mismatch.

## Gotchas

- **Two `next dev` instances of the same app** (stale `.next`) can make
  every route 404. If the customizer 404s, kill stray dev servers and
  `rm -rf apps/web/.next`.
- MPFB2's basemesh ships helper geometry; anything exported without
  `bake_modifiers_remove_helpers` will include invisible fitting meshes.
- Blender's glTF exporter silently drops shape keys if `export_apply=True`.
- MakeHuman targets and mhclo fittings index *all* basemesh vertices
  (body + helpers), so vertex-index-based operations (target loading, rig
  weight import, asset fitting, per-morph refits) must run **before**
  helper removal.
- `blend_method` on Blender 5.x materials takes `CLIP` (not `MASK`); the
  glTF alphaMode is derived from the node graph, not from `blend_method`
  (`Math:Round` into Alpha ⇒ MASK, plain texture alpha ⇒ BLEND).
- The eyes texture keeps its cornea UV region at alpha 0 — never export the
  eyes material fully opaque or the iris disappears behind a gray shell.
- `npm exec -y gltfpack` downloads ~680 MB into the npx cache.
