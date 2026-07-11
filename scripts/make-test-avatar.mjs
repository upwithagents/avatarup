import { Document, NodeIO } from '@gltf-transform/core';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2] ?? 'scripts/fixtures/test-avatar.glb';

const doc = new Document();
const scene = doc.createScene('scene');
doc.getRoot().setDefaultScene(scene);
const buffer = doc.createBuffer();

// A unit cube centered at origin: 8 corners, 12 triangles.
const CUBE_POSITIONS = new Float32Array([
  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
  -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
]);
const CUBE_INDICES = new Uint16Array([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
  1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
]);

function makeCubePart({ name, materialName, color, translation, scale, withMorphs }) {
  const position = doc
    .createAccessor(`${name}-pos`)
    .setType('VEC3')
    .setArray(CUBE_POSITIONS)
    .setBuffer(buffer);
  const indices = doc
    .createAccessor(`${name}-idx`)
    .setType('SCALAR')
    .setArray(CUBE_INDICES)
    .setBuffer(buffer);
  const material = doc.createMaterial(materialName).setBaseColorFactor([...color, 1]);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', position)
    .setIndices(indices)
    .setMaterial(material);

  if (withMorphs) {
    // 'bulge': push every vertex outward on X/Z; 'stretch': scale up on Y.
    const bulge = new Float32Array(CUBE_POSITIONS.length);
    const stretch = new Float32Array(CUBE_POSITIONS.length);
    for (let i = 0; i < CUBE_POSITIONS.length; i += 3) {
      bulge[i] = Math.sign(CUBE_POSITIONS[i]) * 0.4;
      bulge[i + 2] = Math.sign(CUBE_POSITIONS[i + 2]) * 0.4;
      stretch[i + 1] = CUBE_POSITIONS[i + 1] * 0.8;
    }
    for (const [morphName, deltas] of [['bulge', bulge], ['stretch', stretch]]) {
      const acc = doc
        .createAccessor(`${name}-${morphName}`)
        .setType('VEC3')
        .setArray(deltas)
        .setBuffer(buffer);
      prim.addTarget(doc.createPrimitiveTarget(morphName).setAttribute('POSITION', acc));
    }
  }

  const mesh = doc.createMesh(name).addPrimitive(prim);
  if (withMorphs) mesh.setWeights([0, 0]);
  const node = doc
    .createNode(name)
    .setMesh(mesh)
    .setTranslation(translation)
    .setScale(scale);
  doc.getRoot().getDefaultScene().addChild(node);
}

makeCubePart({
  name: 'body', materialName: 'skin', color: [0.78, 0.53, 0.39],
  translation: [0, 0.9, 0], scale: [0.6, 1.8, 0.35], withMorphs: true,
});
makeCubePart({
  name: 'hair', materialName: 'hair', color: [0.23, 0.18, 0.18],
  translation: [0, 1.95, 0], scale: [0.45, 0.25, 0.4], withMorphs: false,
});
makeCubePart({
  name: 'eyes', materialName: 'eyes', color: [0.29, 0.42, 0.55],
  translation: [0, 1.65, 0.2], scale: [0.3, 0.08, 0.05], withMorphs: false,
});

mkdirSync(dirname(OUT), { recursive: true });
await new NodeIO().write(OUT, doc);
console.log(`wrote ${OUT}`);
