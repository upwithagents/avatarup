"""Author the avatarup base avatar with Blender + MPFB2 and export a GLB.

Creates the MakeHuman base mesh via the MPFB2 extension, bakes a curated set
of MakeHuman targets into named shape keys (exported as glTF morph targets),
extracts placeholder eye/hair meshes from the basemesh helper geometry, adds
the default MPFB rig, and exports a GLB with materials named skin/hair/eyes.

Run headless (MPFB2 extension must be installed and enabled, see
docs/asset-pipeline.md):

    blender --background --python scripts/blender/make-avatar-base.py -- \
        --out /tmp/avatar-base-raw.glb
"""

import argparse
import sys

import bmesh
import bpy

from bl_ext.blender_org.mpfb.services.exportservice import ExportService
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.objectservice import ObjectService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService

# Body macro sliders: baked from MPFB's macro target combination system as a
# single shape key each, as the delta between the modified macro state and the
# default (gender 0.5, age 0.5 = young adult, muscle 0.5, weight 0.5, ...).
MACRO_SLIDERS = [
    ("feminine", {"gender": 0.0}),
    ("masculine", {"gender": 1.0}),
    ("muscular", {"muscle": 1.0}),
    ("heavyset", {"weight": 1.0}),
    ("slender", {"weight": 0.0}),
    ("tall", {"height": 1.0}),
    ("petite", {"height": 0.0}),
]

# Detail sliders: (shape key name, [(system target name, weight)], symmetrize)
# Target names are MakeHuman system targets shipped inside MPFB2
# (data/targets/**). "symmetrize" mirrors a left-side-only target to the right.
DETAIL_SLIDERS = [
    ("belly", [("stomach-pregnant-incr", 1.0)], False),
    ("bust", [("measure-bust-circ-incr", 1.0)], False),
    ("buttocks", [("buttocks-volume-incr", 1.0)], False),
    ("head-round", [("head-round", 1.0)], False),
    ("jaw-width", [("chin-width-incr", 1.0)], False),
    ("chin-prominent", [("chin-prominent-incr", 1.0)], False),
    ("nose-size", [("nose-volume-incr", 1.0)], False),
    ("nose-width", [("nose-scale-horiz-incr", 1.0)], False),
    ("mouth-width", [("mouth-scale-horiz-incr", 1.0)], False),
    (
        "lip-fullness",
        [("mouth-upperlip-volume-incr", 1.0), ("mouth-lowerlip-volume-incr", 1.0)],
        False,
    ),
    ("eye-size", [("l-eye-scale-incr", 1.0)], True),
    ("cheek-fullness", [("l-cheek-volume-incr", 1.0)], True),
    ("ear-size", [("l-ear-scale-incr", 1.0)], True),
]

MATERIALS = {
    # name: (base color RGBA, roughness)
    "skin": ((0.75, 0.57, 0.45, 1.0), 0.6),
    "eyes": ((0.25, 0.15, 0.08, 1.0), 0.2),
    "hair": ((0.12, 0.07, 0.03, 1.0), 0.75),
}


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="/tmp/avatar-base-raw.glb")
    return parser.parse_args(argv)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def make_material(name, rgba, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def extract_helper_object(basemesh, group_names, obj_name, normal_offset=0.0, min_z=None):
    """Duplicate the basemesh and keep only the given helper vertex groups.

    The MakeHuman basemesh ships helper geometry (eye/hair fitting meshes);
    we reuse it as simple placeholder eyeballs and a hair cap. min_z drops
    vertices below a world height, used to trim the long-hair helper (which
    drapes over the face and chest) down to a scalp cap.

    Called after the curated shape keys are loaded on the basemesh: MakeHuman
    targets also displace helper vertices, so the extracted meshes keep
    same-named shape keys and deform in sync with the body at runtime.
    Deletion happens in edit mode so shape keys survive.
    """
    dup = ObjectService.duplicate_blender_object(basemesh)
    dup.name = obj_name
    dup.data.name = obj_name
    dup.parent = None
    dup.matrix_world = basemesh.matrix_world.copy()
    for modifier in list(dup.modifiers):
        dup.modifiers.remove(modifier)

    if not any(vg.name in group_names for vg in dup.vertex_groups):
        raise RuntimeError(f"No vertex groups {group_names} on {basemesh.name}")

    ObjectService.deselect_and_deactivate_all()
    ObjectService.activate_blender_object(dup)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_mode(type="VERT")
    for group_name in group_names:
        dup.vertex_groups.active_index = dup.vertex_groups[group_name].index
        bpy.ops.object.vertex_group_select()
    if min_z is not None:
        bm = bmesh.from_edit_mesh(dup.data)
        for v in bm.verts:
            if v.co.z < min_z:
                v.select = False
        bm.select_flush_mode()
        bmesh.update_edit_mesh(dup.data)
    bpy.ops.mesh.select_all(action="INVERT")
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.object.mode_set(mode="OBJECT")

    if normal_offset:
        # Push the mesh out along vertex normals to avoid z-fighting with the
        # scalp. Apply the same offset to every shape key layer so morphs
        # remain consistent with the offset basis.
        normals = [v.normal.copy() for v in dup.data.vertices]
        for key in dup.data.shape_keys.key_blocks if dup.data.shape_keys else []:
            for i, point in enumerate(key.data):
                point.co += normals[i] * normal_offset
        for i, v in enumerate(dup.data.vertices):
            v.co += normals[i] * normal_offset

    for vg in list(dup.vertex_groups):
        dup.vertex_groups.remove(vg)
    return dup


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
    for name, overrides in MACRO_SLIDERS:
        bake_combo_shape_key(basemesh, name, macro_delta_components(overrides))
        print(f"  {name}")

    print("Loading detail target sliders as shape keys ...")
    for name, targets, symmetrize in DETAIL_SLIDERS:
        components = []
        for target_name, weight in targets:
            full_path = TargetService.target_full_path(target_name)
            if not full_path:
                raise RuntimeError(f"Could not resolve target {target_name}")
            components.append((full_path, weight))
        if len(components) == 1 and components[0][1] == 1.0:
            key = TargetService.load_target(
                basemesh, components[0][0], weight=0.0, name=name
            )
        else:
            key = bake_combo_shape_key(basemesh, name, components)
        if symmetrize:
            TargetService.symmetrize_shape_key(basemesh, key.name, True)
        print(f"  {name}")

    print("Extracting placeholder eyes/hair from helper geometry ...")
    eyes = extract_helper_object(basemesh, {"helper-l-eye", "helper-r-eye"}, "Eyes")
    # Trim the long-hair helper to a scalp cap: keep only what sits above the
    # brow line (approximated from the eye helpers' height).
    eye_top_z = max((eyes.matrix_world @ v.co).z for v in eyes.data.vertices)
    hair = extract_helper_object(
        basemesh, {"helper-hair"}, "Hair", normal_offset=0.004,
        min_z=eye_top_z + 0.01,
    )

    print("Adding default rig ...")
    armature = HumanService.add_builtin_rig(basemesh, "default", import_weights=True)
    eyes.parent = armature
    hair.parent = armature

    print("Removing helper geometry (keeping shape keys) ...")
    ExportService.bake_modifiers_remove_helpers(
        basemesh, bake_masks=True, bake_subdiv=False, remove_helpers=True,
        also_proxy=False,
    )

    print("Assigning materials ...")
    materials = {
        name: make_material(name, rgba, rough)
        for name, (rgba, rough) in MATERIALS.items()
    }
    assign_material(basemesh, materials["skin"])
    assign_material(eyes, materials["eyes"])
    assign_material(hair, materials["hair"])

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

    names = [
        k.name
        for k in basemesh.data.shape_keys.key_blocks
        if k.name != "Basis"
    ]
    print(f"Exported {len(names)} morph targets: {', '.join(names)}")


main()
