import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createBeamBetween,
  createChain,
  createClippedBox,
  createGearRing,
  seededRandom,
} from '../src/model/geometry';

const material = new MeshStandardMaterial();

describe('procedural geometry', () => {
  it('repeats the same seeded sequence and changes for a different seed', () => {
    const a = seededRandom(20260805);
    const b = seededRandom(20260805);
    const c = seededRandom(20260806);
    const first = [a(), a(), a()];
    expect(first).toEqual([b(), b(), b()]);
    expect(first).not.toEqual([c(), c(), c()]);
  });

  it('creates the requested radial gear teeth', () => {
    const ring = createGearRing(
      { radius: 3.45, toothCount: 32, toothSize: [0.38, 0.24, 0.5] },
      material,
    );
    expect(ring.name).toBe('gear-ring');
    expect(ring.userData.toothCount).toBe(32);
    expect(ring.getObjectByName('gear-teeth')).toBeTruthy();
  });

  it('aligns a beam between the supplied endpoints', () => {
    const beam = createBeamBetween(
      new Vector3(-1, 2, 0),
      new Vector3(3, 4, 2),
      0.3,
      material,
    );
    expect(beam.position.toArray()).toEqual([1, 3, 1]);
    expect(beam.userData.length).toBeCloseTo(Math.sqrt(24));
  });

  it('creates clipped solid geometry and alternating chain links', () => {
    const clipped = createClippedBox(10, 0.9, 10, 0.9, material);
    const chain = createChain(
      [new Vector3(0, 0, 0), new Vector3(0, -2, 0.5), new Vector3(1, -3, 0)],
      8,
      material,
    );
    expect(clipped.name).toBe('clipped-box');
    expect(clipped.geometry.getAttribute('position').count).toBeGreaterThan(24);
    expect(chain.userData.linkCount).toBe(8);
    expect(chain.children).toHaveLength(8);
  });

  it('creates elongated tangent-following links in alternating planes', () => {
    const chain = createChain(
      [new Vector3(0, 0, 0), new Vector3(0, -2, 0), new Vector3(0, -4, 0)],
      6,
      material,
    );
    const first = chain.children[0] as Mesh;
    const second = chain.children[1] as Mesh;
    first.geometry.computeBoundingBox();
    const size = first.geometry.boundingBox!.getSize(new Vector3());
    const localLongAxis = new Vector3(0, 1, 0).applyQuaternion(first.quaternion);

    expect(Math.max(size.x, size.y) / Math.min(size.x, size.y)).toBeGreaterThan(1.35);
    expect(Math.abs(localLongAxis.dot(new Vector3(0, -1, 0)))).toBeGreaterThan(0.9);
    expect(first.quaternion.angleTo(second.quaternion)).toBeGreaterThan(1.2);
  });
});
