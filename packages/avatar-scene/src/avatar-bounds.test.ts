import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { computeViewPresets } from './avatar-bounds';

describe('computeViewPresets', () => {
  it('reproduces the legacy hand-tuned presets for a 1.67-unit-tall mesh at ground level', () => {
    const box = new Box3(new Vector3(-0.3, 0, -0.2), new Vector3(0.3, 1.67, 0.2));
    const presets = computeViewPresets(box);
    expect(presets.face.position[1]).toBeCloseTo(1.58, 1);
    expect(presets.face.target[1]).toBeCloseTo(1.58, 1);
    expect(presets.torso.position[1]).toBeCloseTo(1.47, 1);
    expect(presets.torso.target[1]).toBeCloseTo(1.32, 1);
    expect(presets.full.position[1]).toBeCloseTo(1.3, 1);
    expect(presets.full.target[1]).toBeCloseTo(0.95, 1);
  });

  it('scales presets proportionally for a mesh twice as tall', () => {
    const box = new Box3(new Vector3(-0.6, 0, -0.4), new Vector3(0.6, 3.34, 0.4));
    const presets = computeViewPresets(box);
    expect(presets.face.position[1]).toBeCloseTo(3.16, 1);
  });

  it('offsets by the box floor when the mesh does not start at y=0', () => {
    const box = new Box3(new Vector3(-0.3, 0.5, -0.2), new Vector3(0.3, 2.17, 0.2));
    const presets = computeViewPresets(box);
    expect(presets.face.position[1]).toBeCloseTo(1.58 + 0.5, 1);
  });

  it('keeps X centered at 0 and never returns non-finite numbers for a degenerate zero-height box', () => {
    const box = new Box3(new Vector3(0, 0, 0), new Vector3(0, 0, 0));
    const presets = computeViewPresets(box);
    for (const view of Object.values(presets)) {
      expect(view.position[0]).toBe(0);
      for (const n of [...view.position, ...view.target]) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });
});
