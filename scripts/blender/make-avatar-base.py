"""Author the avatarup base avatar with Blender + MPFB2 and export a GLB.

Creates the MakeHuman base mesh via the MPFB2 extension, bakes a curated set
of MakeHuman targets into named shape keys (exported as glTF morph targets),
fits real eyeball and hair assets (CC0, MakeHuman system assets vendored in
scripts/blender/assets/) to the body, bakes matching per-morph shape keys
onto them, adds the default MPFB rig, and exports a GLB with materials named
skin/hair/eyes. Also writes scripts/fixtures/controls-manifest.json, the
single source of truth for the customizer's slider list.

Run headless (MPFB2 extension must be installed and enabled, see
docs/asset-pipeline.md):

    blender --background --python scripts/blender/make-avatar-base.py -- \
        --out /tmp/avatar-base-raw.glb
"""

import argparse
import json
import os
import sys

import bpy

from bl_ext.blender_org.mpfb.entities.clothes.mhclo import Mhclo
from bl_ext.blender_org.mpfb.services.clothesservice import ClothesService
from bl_ext.blender_org.mpfb.services.exportservice import ExportService
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(SCRIPT_DIR, "assets")
DEFAULT_MANIFEST = os.path.normpath(
    os.path.join(SCRIPT_DIR, "..", "fixtures", "controls-manifest.json")
)

# Body macro sliders: baked from MPFB's macro target combination system as a
# single shape key each, as the delta between the modified macro state and the
# default (gender 0.5, age 0.5 = young adult, muscle 0.5, weight 0.5, ...).
# The gender macro spans a single female(0)..male(1) interpolation segment, so
# gender 0.0 / 1.0 deltas already carry the full female/male target strength.
# "feminine" additionally raises cupsize: at the default 0.5/0.5
# cupsize/firmness MPFB excludes all breast targets (averagecup-averagefirmness
# is the forbidden neutral combination), which left the female shape flat.
# cupsize 0.75 + firmness 0.5 resolves to the single component
# breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness ~0.49.
MACRO_SLIDERS = [
    # (morph name, group, label, macro overrides)
    ("feminine", "Body", "Feminine", {"gender": 0.0, "cupsize": 0.75}),
    ("masculine", "Body", "Masculine", {"gender": 1.0}),
    ("muscular", "Body", "Muscular", {"muscle": 1.0}),
    ("heavyset", "Body", "Heavyset", {"weight": 1.0}),
    ("slender", "Body", "Slender", {"weight": 0.0}),
    ("tall", "Body", "Tall", {"height": 1.0}),
    ("petite", "Body", "Petite", {"height": 0.0}),
]

# Detail sliders: (morph name, group, label, [(system target name, weight)]).
# Target names are MakeHuman system targets shipped inside MPFB2
# (data/targets/**). Bilateral features list both l-/r- targets so one slider
# drives both sides.
DETAIL_SLIDERS = [
    # Body (limbs & extremities)
    ("arms-thickness", "Body", "Arm thickness", [
        ("l-upperarm-scale-horiz-incr", 1.0), ("r-upperarm-scale-horiz-incr", 1.0),
        ("l-lowerarm-scale-horiz-incr", 1.0), ("r-lowerarm-scale-horiz-incr", 1.0),
    ]),
    ("legs-thickness", "Body", "Leg thickness", [
        ("l-upperleg-scale-horiz-incr", 1.0), ("r-upperleg-scale-horiz-incr", 1.0),
        ("l-lowerleg-scale-horiz-incr", 1.0), ("r-lowerleg-scale-horiz-incr", 1.0),
    ]),
    ("hands-size", "Body", "Hand size", [
        ("l-hand-scale-incr", 1.0), ("r-hand-scale-incr", 1.0),
    ]),
    ("feet-size", "Body", "Foot size", [
        ("l-foot-scale-incr", 1.0), ("r-foot-scale-incr", 1.0),
    ]),
    # Torso
    ("belly", "Torso", "Belly", [("stomach-pregnant-incr", 1.0)]),
    ("bust", "Torso", "Bust", [("measure-bust-circ-incr", 1.0)]),
    ("buttocks", "Torso", "Buttocks", [("buttocks-volume-incr", 1.0)]),
    ("shoulders-width", "Torso", "Shoulder width", [("measure-shoulder-dist-incr", 1.0)]),
    ("waist-narrow", "Torso", "Narrow waist", [("measure-waist-circ-decr", 1.0)]),
    ("hips-width", "Torso", "Hip width", [("hip-scale-horiz-incr", 1.0)]),
    ("torso-v-shape", "Torso", "V-shape torso", [("torso-vshape-incr", 1.0)]),
    ("neck-thickness", "Torso", "Neck thickness", [
        ("neck-scale-horiz-incr", 1.0), ("neck-scale-depth-incr", 1.0),
    ]),
    ("neck-length", "Torso", "Neck length", [("neck-scale-vert-incr", 1.0)]),
    # Head (overall skull / face shape)
    ("head-round", "Head", "Round face", [("head-round", 1.0)]),
    ("face-oval", "Head", "Oval face", [("head-oval", 1.0)]),
    ("face-square", "Head", "Square face", [("head-square", 1.0)]),
    ("forehead-height", "Head", "Forehead height", [("forehead-scale-vert-incr", 1.0)]),
    ("temples-width", "Head", "Temple width", [("forehead-temple-incr", 1.0)]),
    ("ear-size", "Head", "Ear size", [
        ("l-ear-scale-incr", 1.0), ("r-ear-scale-incr", 1.0),
    ]),
    # Face (jaw, chin, cheeks, brow)
    ("jaw-width", "Face", "Jaw width", [("chin-width-incr", 1.0)]),
    ("chin-prominent", "Face", "Chin size", [("chin-prominent-incr", 1.0)]),
    ("chin-height", "Face", "Chin height", [("chin-height-incr", 1.0)]),
    ("cheek-fullness", "Face", "Cheek fullness", [
        ("l-cheek-volume-incr", 1.0), ("r-cheek-volume-incr", 1.0),
    ]),
    ("cheekbones", "Face", "Cheekbones", [
        ("l-cheek-bones-incr", 1.0), ("r-cheek-bones-incr", 1.0),
    ]),
    ("brow-height", "Face", "Brow height", [("eyebrows-trans-up", 1.0)]),
    ("brow-angle", "Face", "Brow angle", [("eyebrows-angle-up", 1.0)]),
    # Eyes
    ("eye-size", "Eyes", "Eye size", [
        ("l-eye-scale-incr", 1.0), ("r-eye-scale-incr", 1.0),
    ]),
    ("eye-spacing", "Eyes", "Eye spacing", [
        ("l-eye-trans-out", 1.0), ("r-eye-trans-out", 1.0),
    ]),
    ("eye-tilt", "Eyes", "Eye tilt", [
        ("l-eye-corner1-up", 1.0), ("r-eye-corner1-up", 1.0),
    ]),
    ("eyelid-height", "Eyes", "Eyelid height", [
        ("l-eye-height2-incr", 1.0), ("r-eye-height2-incr", 1.0),
    ]),
    # Nose
    ("nose-size", "Nose", "Nose size", [("nose-volume-incr", 1.0)]),
    ("nose-width", "Nose", "Nose width", [("nose-scale-horiz-incr", 1.0)]),
    ("nose-length", "Nose", "Nose length", [("nose-scale-vert-incr", 1.0)]),
    ("nose-tip-up", "Nose", "Nose tip up", [("nose-point-up", 1.0)]),
    ("nose-hump", "Nose", "Nose hump", [("nose-hump-incr", 1.0)]),
    ("nostril-flare", "Nose", "Nostril flare", [("nose-flaring-incr", 1.0)]),
    # Mouth
    ("mouth-width", "Mouth", "Mouth width", [("mouth-scale-horiz-incr", 1.0)]),
    ("lip-fullness", "Mouth", "Lip fullness", [
        ("mouth-upperlip-volume-incr", 1.0), ("mouth-lowerlip-volume-incr", 1.0),
    ]),
    ("mouth-corners-up", "Mouth", "Smile corners", [("mouth-angles-up", 1.0)]),
]

# Vendored CC0 MakeHuman system assets (see docs/asset-pipeline.md for
# provenance). Each is fitted to the basemesh with MPFB's mhclo machinery and
# then gets per-morph shape keys baked so it follows the body at runtime.
EYES_MHCLO = os.path.join(ASSETS_DIR, "eyes", "high-poly", "high-poly.mhclo")
EYES_TEXTURE = os.path.join(ASSETS_DIR, "eyes", "materials", "brown_eye.png")
HAIR_MHCLO = os.path.join(ASSETS_DIR, "hair", "short02.mhclo")
HAIR_TEXTURE = os.path.join(ASSETS_DIR, "hair", "short02_diffuse.png")

SKIN_RGBA = (0.75, 0.57, 0.45, 1.0)

# Per-vertex deltas below this length (meters) are treated as refit noise and
# snapped back to the basis so Blender exports sparse morph accessors.
FIT_EPSILON = 1e-6


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="/tmp/avatar-base-raw.glb")
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST)
    return parser.parse_args(argv)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def make_skin_material():
    mat = bpy.data.materials.new("skin")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = SKIN_RGBA
    bsdf.inputs["Roughness"].default_value = 0.6
    return mat


def make_textured_material(name, image_path, roughness, *, max_size=None,
                           alpha=None):
    """Principled BSDF with a packed image texture, glTF-export friendly.

    alpha: None (opaque), "BLEND" (texture alpha straight into the BSDF Alpha
    input) or "MASK" (alpha through a Math:Round node, which the glTF
    exporter recognizes as alphaMode MASK with cutoff 0.5 — cutouts don't
    suffer from three.js transparency sorting).
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = roughness

    image = bpy.data.images.load(image_path)
    if max_size and max(image.size) > max_size:
        image.scale(max_size, max_size)
    image.pack()

    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha == "BLEND":
        links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    elif alpha == "MASK":
        clip = nodes.new("ShaderNodeMath")
        clip.operation = "ROUND"
        links.new(tex.outputs["Alpha"], clip.inputs[0])
        links.new(clip.outputs[0], bsdf.inputs["Alpha"])
    if alpha:
        # Viewport/EEVEE transparency settings; the glTF alphaMode itself is
        # derived from the node graph.
        blend_method = "CLIP" if alpha == "MASK" else alpha
        for attr, value in (("blend_method", blend_method),
                            ("use_backface_culling", False)):
            if hasattr(mat, attr):
                setattr(mat, attr, value)
    return mat


def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def bake_combo_shape_key(basemesh, name, components):
    """Bake several weighted targets into a single named shape key (value 0).

    components: list of (target file path, weight); weights may be negative.
    """
    temp_keys = []
    for i, (path, weight) in enumerate(components):
        tmp_name = f"__combo_tmp_{i}"
        key = TargetService.load_target(basemesh, path, weight=0.0, name=tmp_name)
        key.slider_min = -2.0
        key.slider_max = 2.0
        key.value = weight
        temp_keys.append(key.name)

    new_key = TargetService.create_shape_key(
        basemesh, name, also_create_basis=True, create_from_mix=True
    )

    key_blocks = basemesh.data.shape_keys.key_blocks
    for tmp_name in temp_keys:
        basemesh.shape_key_remove(key_blocks[tmp_name])
    new_key.value = 0.0
    return new_key


def macro_delta_components(overrides):
    """Target components (path, weight) for a macro change vs the default state."""
    default_info = TargetService.get_default_macro_info_dict()
    modified_info = TargetService.get_default_macro_info_dict()
    modified_info.update(overrides)

    default_stack = dict(
        TargetService.calculate_target_stack_from_macro_info_dict(default_info)
    )
    modified_stack = dict(
        TargetService.calculate_target_stack_from_macro_info_dict(modified_info)
    )

    components = []
    for target_name in sorted(set(default_stack) | set(modified_stack)):
        delta = modified_stack.get(target_name, 0.0) - default_stack.get(
            target_name, 0.0
        )
        if abs(delta) < 0.01:
            continue
        basename = target_name.split("/")[-1]
        full_path = TargetService.target_full_path(basename)
        if not full_path:
            raise RuntimeError(f"Could not resolve macro target {target_name}")
        components.append((full_path, delta))
    if not components:
        raise RuntimeError(f"No macro delta components for {overrides}")
    return components


def add_fitted_asset(basemesh, mhclo_path, obj_name, asset_type):
    """Load an mhclo asset, fit it to the basemesh and rig it.

    material_type "NONE" skips MPFB's MakeSkin material (we assign our own
    glTF-friendly materials later).
    """
    clothes = HumanService.add_mhclo_asset(
        mhclo_path, basemesh, asset_type=asset_type, subdiv_levels=0,
        material_type="NONE",
    )
    clothes.name = obj_name
    clothes.data.name = obj_name
    return clothes


def bake_asset_morph_keys(basemesh, clothes, mhclo_path):
    """Bake the basemesh's curated morphs as shape keys onto a fitted asset.

    For each curated shape key: set it to 1.0 on the body, refit the asset
    with MPFB's mhclo vertex mapping (each asset vertex follows three bound
    body vertices), and store the fitted positions as a same-named shape key.
    This keeps eyes/hair glued to the head when morphs are applied at runtime
    (the scene applies morph values by name to every mesh).

    Deltas below FIT_EPSILON are snapped to the basis so morphs that don't
    move the asset export as (nearly) empty sparse accessors.
    """
    mhclo = Mhclo()
    mhclo.load(mhclo_path)
    mhclo.clothes = clothes

    curated = [
        k.name
        for k in basemesh.data.shape_keys.key_blocks
        if k.name != "Basis"
    ]

    basis_pos = [v.co.copy() for v in clothes.data.vertices]
    morph_pos = {}
    key_blocks = basemesh.data.shape_keys.key_blocks
    for name in curated:
        key = key_blocks[name]
        key.value = 1.0
        ClothesService.fit_clothes_to_human(
            clothes, basemesh, mhclo, set_parent=False
        )
        morph_pos[name] = [v.co.copy() for v in clothes.data.vertices]
        key.value = 0.0

    # Restore rest positions, then write everything as shape keys.
    for v, co in zip(clothes.data.vertices, basis_pos):
        v.co = co
    clothes.shape_key_add(name="Basis", from_mix=False)
    for name in curated:
        shape_key = clothes.shape_key_add(name=name, from_mix=False)
        moved = 0
        for i, co in enumerate(morph_pos[name]):
            if (co - basis_pos[i]).length > FIT_EPSILON:
                shape_key.data[i].co = co
                moved += 1
        print(f"    {clothes.name}/{name}: {moved} verts move")


def write_manifest(path):
    entries = [
        {"group": group, "morph": name, "label": label}
        for name, group, label, _ in MACRO_SLIDERS
    ] + [
        {"group": group, "morph": name, "label": label}
        for name, group, label, _ in DETAIL_SLIDERS
    ]
    # Order by group (stable within group = table order) for a sane panel.
    group_order = ["Body", "Torso", "Head", "Face", "Eyes", "Nose", "Mouth"]
    entries.sort(key=lambda e: group_order.index(e["group"]))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)
        f.write("\n")
    return entries


def main():
    args = parse_args()
    clear_scene()

    print("Creating MPFB basemesh ...")
    basemesh = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=True,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,  # MakeHuman decimeters -> meters
    )

    # Bake the default macro state (androgynous young adult) into the mesh so
    # the exported morph target list contains only our curated shape keys.
    if TargetService.has_any_shapekey(basemesh):
        TargetService.bake_targets(basemesh)

    print("Baking macro sliders as shape keys ...")
    for name, _group, _label, overrides in MACRO_SLIDERS:
        bake_combo_shape_key(basemesh, name, macro_delta_components(overrides))
        print(f"  {name}")

    print("Loading detail target sliders as shape keys ...")
    for name, _group, _label, targets in DETAIL_SLIDERS:
        components = []
        for target_name, weight in targets:
            full_path = TargetService.target_full_path(target_name)
            if not full_path:
                raise RuntimeError(f"Could not resolve target {target_name}")
            components.append((full_path, weight))
        if len(components) == 1 and components[0][1] == 1.0:
            TargetService.load_target(
                basemesh, components[0][0], weight=0.0, name=name
            )
        else:
            bake_combo_shape_key(basemesh, name, components)
        print(f"  {name}")

    print("Adding default rig ...")
    armature = HumanService.add_builtin_rig(basemesh, "default", import_weights=True)

    print("Fitting eyes and hair assets ...")
    eyes = add_fitted_asset(basemesh, EYES_MHCLO, "Eyes", "Eyes")
    hair = add_fitted_asset(basemesh, HAIR_MHCLO, "Hair", "Hair")

    print("Baking morph shape keys onto fitted assets ...")
    for clothes, mhclo_path in ((eyes, EYES_MHCLO), (hair, HAIR_MHCLO)):
        bake_asset_morph_keys(basemesh, clothes, mhclo_path)

    print("Removing helper geometry (keeping shape keys) ...")
    ExportService.bake_modifiers_remove_helpers(
        basemesh, bake_masks=True, bake_subdiv=False, remove_helpers=True,
        also_proxy=False,
    )

    print("Assigning materials ...")
    assign_material(basemesh, make_skin_material())
    # MASK alpha: the MakeHuman eye mesh has an outer cornea layer whose UV
    # region is fully transparent in the texture; without alpha it renders as
    # an opaque shell hiding the iris. MASK (not BLEND) so the eyeballs stay
    # depth-written and never draw over transparent hair strands.
    assign_material(
        eyes,
        make_textured_material(
            "eyes", EYES_TEXTURE, 0.15, max_size=512, alpha="MASK"
        ),
    )
    assign_material(
        hair,
        make_textured_material(
            "hair", HAIR_TEXTURE, 0.65, max_size=1024, alpha="BLEND"
        ),
    )

    basemesh.name = "Body"
    basemesh.data.name = "Body"

    # Normalize slider ranges for runtime use ([0, 1], all at rest).
    for obj in (basemesh, eyes, hair):
        if not obj.data.shape_keys:
            continue
        for key in obj.data.shape_keys.key_blocks:
            if key.name == "Basis":
                continue
            key.slider_min = 0.0
            key.slider_max = 1.0
            key.value = 0.0

    print(f"Exporting {args.out} ...")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=args.out,
        export_format="GLB",
        export_morph=True,
        export_morph_normal=False,
        export_animations=False,
        export_skins=True,
        export_cameras=False,
        export_lights=False,
        export_apply=False,
        export_yup=True,
    )

    entries = write_manifest(args.manifest)
    print(f"Wrote manifest with {len(entries)} controls: {args.manifest}")

    names = [
        k.name
        for k in basemesh.data.shape_keys.key_blocks
        if k.name != "Basis"
    ]
    manifest_names = [e["morph"] for e in entries]
    if sorted(names) != sorted(manifest_names):
        raise RuntimeError(
            "Manifest/asset morph mismatch: "
            f"only in asset {sorted(set(names) - set(manifest_names))}, "
            f"only in manifest {sorted(set(manifest_names) - set(names))}"
        )
    print(f"Exported {len(names)} morph targets: {', '.join(names)}")


main()
