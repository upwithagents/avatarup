# Skin texture presets — sources & licenses

`fair.png`, `medium.png`, `deep.png` are **original procedural artwork**,
generated (not hand-drawn, not sourced from any external asset pack) by
`scripts/generate-skin-textures.sh` — a flat base tone plus a blurred-noise
"mottle" layer and a fine-grain "pore" layer, composited with ImageMagick.
No external files, no attribution required, no license to track — this is
the project's own work.

This is a deliberate substitution: the brief for this task assumed the
MakeHuman skin textures vendored for the Blender pipeline (like the eyes/hair
assets documented in `docs/asset-pipeline.md`) would work as a source, but no
skin textures were ever vendored under `scripts/blender/assets/` — only eyes
and hair. Rather than fetch and vet a new external CC0 pack, this repo
generates its own.

Regenerate with:

```bash
scripts/generate-skin-textures.sh
```
