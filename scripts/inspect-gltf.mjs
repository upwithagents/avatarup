import { NodeIO } from '@gltf-transform/core';

const path = process.argv[2];
if (!path) {
  console.error('usage: node inspect-gltf.mjs <file.glb>');
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(path);
const root = doc.getRoot();

for (const mesh of root.listMeshes()) {
  console.log(`mesh: ${mesh.getName()}`);
  for (const prim of mesh.listPrimitives()) {
    const targets = prim.listTargets().map((t) => t.getName());
    console.log(`  morphTargets: [${targets.join(', ')}]`);
    const mat = prim.getMaterial();
    console.log(`  material: ${mat ? mat.getName() : '(none)'}`);
    console.log(`  vertices: ${prim.getAttribute('POSITION').getCount()}`);
  }
}
console.log(`materials: [${root.listMaterials().map((m) => m.getName()).join(', ')}]`);
