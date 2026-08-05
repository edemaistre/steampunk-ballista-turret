import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial } from 'three';

import { calculateModelStatistics } from '../src/model/statistics';

describe('calculateModelStatistics', () => {
  it('counts physical mesh instances and rendered triangle faces', () => {
    const root = new Group();
    const material = new MeshBasicMaterial();
    const single = new Mesh(new BoxGeometry(1, 1, 1), material);
    const instanced = new InstancedMesh(new BoxGeometry(1, 1, 1), material, 4);
    root.add(single, instanced);

    expect(calculateModelStatistics(root)).toEqual({
      parts: 5,
      faces: 60,
    });
  });
});
