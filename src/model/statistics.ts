import { InstancedMesh, Mesh, type Object3D } from 'three';

export interface ModelStatistics {
  readonly parts: number;
  readonly faces: number;
}

function meshFaceCount(mesh: Mesh): number {
  const geometry = mesh.geometry;
  const vertexCount = geometry.getAttribute('position')?.count ?? 0;
  const indexCount = geometry.index?.count ?? vertexCount;
  return Math.floor(indexCount / 3);
}

export function calculateModelStatistics(root: Object3D): ModelStatistics {
  let parts = 0;
  let faces = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const instanceCount = object instanceof InstancedMesh ? object.count : 1;
    parts += instanceCount;
    faces += meshFaceCount(object) * instanceCount;
  });
  return { parts, faces };
}
