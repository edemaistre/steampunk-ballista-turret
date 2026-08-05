import { Group, Mesh, type BufferGeometry, type Material } from 'three';

import type { BallistaMaterials } from '../materials';
import type { BallistaSpec, PartId } from '../types';

export interface BuildContext {
  readonly spec: BallistaSpec;
  readonly materials: BallistaMaterials;
}

export interface AssemblyResult {
  readonly root: Group;
  readonly parts: Map<PartId, Group>;
  readonly explodeVectors: Map<PartId, readonly [number, number, number]>;
}

export function createPartGroup(
  id: PartId,
  name: string,
  explodeVector: readonly [number, number, number],
): Group {
  const group = new Group();
  group.name = name;
  group.userData.partId = id;
  group.userData.selectable = true;
  group.userData.explodeVector = [...explodeVector];
  return group;
}

export function createNamedMesh(
  name: string,
  geometry: BufferGeometry,
  material: Material,
  explodeWithParent = true,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.explodeWithParent = explodeWithParent;
  return mesh;
}
