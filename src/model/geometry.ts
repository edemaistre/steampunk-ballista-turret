import {
  BoxGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Shape,
  TorusGeometry,
  Vector3,
  type Material,
} from 'three';

export interface GearRingOptions {
  readonly radius: number;
  readonly toothCount: number;
  readonly toothSize: readonly [number, number, number];
  readonly tube?: number;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createClippedBox(
  width: number,
  height: number,
  depth: number,
  clip: number,
  material: Material,
): Mesh {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const shape = new Shape();
  shape.moveTo(-halfWidth + clip, -halfDepth);
  shape.lineTo(halfWidth - clip, -halfDepth);
  shape.lineTo(halfWidth, -halfDepth + clip);
  shape.lineTo(halfWidth, halfDepth - clip);
  shape.lineTo(halfWidth - clip, halfDepth);
  shape.lineTo(-halfWidth + clip, halfDepth);
  shape.lineTo(-halfWidth, halfDepth - clip);
  shape.lineTo(-halfWidth, -halfDepth + clip);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.12, height * 0.18),
    bevelThickness: Math.min(0.1, height * 0.14),
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, material);
  mesh.name = 'clipped-box';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createGearRing(options: GearRingOptions, material: Material): Group {
  const group = new Group();
  group.name = 'gear-ring';
  group.userData.toothCount = options.toothCount;

  const ring = new Mesh(
    new TorusGeometry(options.radius, options.tube ?? 0.18, 8, 64),
    material,
  );
  ring.name = 'gear-ring-core';
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  const teeth = new InstancedMesh(
    new BoxGeometry(...options.toothSize),
    material,
    options.toothCount,
  );
  teeth.name = 'gear-teeth';
  teeth.castShadow = true;
  teeth.receiveShadow = true;
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  for (let index = 0; index < options.toothCount; index += 1) {
    const angle = (index / options.toothCount) * Math.PI * 2;
    const position = new Vector3(
      Math.cos(angle) * (options.radius + options.toothSize[2] * 0.34),
      0,
      Math.sin(angle) * (options.radius + options.toothSize[2] * 0.34),
    );
    quaternion.setFromAxisAngle(new Vector3(0, 1, 0), -angle);
    matrix.compose(position, quaternion, scale);
    teeth.setMatrixAt(index, matrix);
  }
  teeth.instanceMatrix.needsUpdate = true;
  group.add(teeth);
  return group;
}

export function createBeamBetween(
  start: Vector3,
  end: Vector3,
  thickness: number,
  material: Material,
): Mesh {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new Mesh(
    new BoxGeometry(thickness, length, thickness),
    material,
  );
  mesh.name = 'beam';
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  );
  mesh.userData.length = length;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createChain(
  points: readonly Vector3[],
  linkCount: number,
  material: Material,
): Group {
  if (points.length < 2) {
    throw new Error('A chain requires at least two control points.');
  }
  const curve = new CatmullRomCurve3([...points]);
  const group = new Group();
  group.name = 'chain';
  group.userData.linkCount = linkCount;
  const geometry = new TorusGeometry(0.18, 0.055, 6, 12);
  geometry.scale(0.78, 1.48, 1);
  const localLongAxis = new Vector3(0, 1, 0);
  const alignToTangent = new Quaternion();
  const alternatingTwist = new Quaternion();
  for (let index = 0; index < linkCount; index += 1) {
    const progress = linkCount === 1 ? 0 : index / (linkCount - 1);
    const link = new Mesh(geometry, material);
    link.name = `chain-link-${index + 1}`;
    link.position.copy(curve.getPoint(progress));
    alignToTangent.setFromUnitVectors(localLongAxis, curve.getTangent(progress).normalize());
    alternatingTwist.setFromAxisAngle(localLongAxis, index % 2 === 0 ? 0 : Math.PI / 2);
    link.quaternion.copy(alignToTangent).multiply(alternatingTwist);
    link.userData.explodeWithParent = true;
    link.castShadow = true;
    group.add(link);
  }
  return group;
}
