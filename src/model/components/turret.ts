import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import { createChain, createClippedBox } from '../geometry';
import { createNamedMesh, createPartGroup, type AssemblyResult, type BuildContext } from './shared';

export interface TurretAssembly extends AssemblyResult {
  readonly elevationPivot: Group;
}

function createSideArmor(
  name: string,
  side: -1 | 1,
  context: BuildContext,
): Mesh {
  const shape = new Shape();
  shape.moveTo(-2.0, 0);
  shape.lineTo(1.9, 0);
  shape.lineTo(1.48, 3.3);
  shape.lineTo(-1.15, 3.45);
  shape.lineTo(-1.72, 2.5);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.34,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.08,
    bevelThickness: 0.06,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(side * -0.17, 0, 0);
  geometry.computeVertexNormals();
  const panel = createNamedMesh(name, geometry, context.materials.teal);
  panel.position.x = side * 1.72;
  panel.rotation.y = side === 1 ? 0 : Math.PI;
  return panel;
}

function createTurretRivets(context: BuildContext): InstancedMesh {
  const positions = [
    [-2.31, 0.4, -1.55], [-2.31, 1.35, -1.72], [-2.31, 2.35, -1.48], [-2.31, 3.0, -0.7],
    [-2.31, 0.4, 1.45], [-2.31, 1.35, 1.65], [-2.31, 2.35, 1.42], [-2.31, 3.0, 0.62],
    [1.93, 0.4, -1.55], [1.93, 1.35, -1.72], [1.93, 2.35, -1.48], [1.93, 3.0, -0.7],
    [1.93, 0.4, 1.45], [1.93, 1.35, 1.65], [1.93, 2.35, 1.42], [1.93, 3.0, 0.62],
  ] as const;
  const rivets = new InstancedMesh(
    new SphereGeometry(0.085, 8, 5),
    context.materials.iron,
    positions.length,
  );
  rivets.name = 'turret-panel-rivets';
  rivets.castShadow = true;
  rivets.userData.explodeWithParent = true;
  const matrix = new Matrix4();
  positions.forEach(([x, y, z], index) => {
    matrix.makeTranslation(x, y, z);
    rivets.setMatrixAt(index, matrix);
  });
  rivets.instanceMatrix.needsUpdate = true;
  return rivets;
}

function createScope(_context: BuildContext): Group {
  const scope = createPartGroup('scope', 'scope', [-2.4, 1.3, -1.6]);
  scope.userData.visualRemoved = true;
  return scope;
}

function createGauge(context: BuildContext): Group {
  const gauge = createPartGroup('gauge', 'pressure-gauge', [-2.2, 0.6, 1.2]);
  gauge.position.set(-2.25, 1.7, -0.95);
  const rim = createNamedMesh(
    'gauge-brass-rim',
    new CylinderGeometry(0.42, 0.42, 0.15, 18),
    context.materials.brass,
  );
  rim.rotation.z = Math.PI / 2;
  gauge.add(rim);
  const face = createNamedMesh(
    'gauge-face',
    new CylinderGeometry(0.33, 0.33, 0.03, 18),
    context.materials.gauge,
  );
  face.rotation.z = Math.PI / 2;
  face.position.x = -0.09;
  gauge.add(face);
  const needle = createNamedMesh(
    'gauge-red-needle',
    new BoxGeometry(0.035, 0.36, 0.04),
    context.materials.rust,
  );
  needle.position.set(-0.13, 0.08, 0);
  needle.rotation.x = -0.62;
  gauge.add(needle);
  return gauge;
}

function createSpareBolts(context: BuildContext): Group {
  const group = createPartGroup('spare-bolts', 'spare-bolts', [-2.2, -0.2, 2.2]);
  group.position.set(-2.12, 0.95, 0.72);
  for (let index = 0; index < 3; index += 1) {
    const bolt = new Group();
    bolt.name = `spare-bolt-${index + 1}`;
    bolt.position.set(0, index * 0.42, index * 0.16);
    bolt.userData.explodeWithParent = true;
    const shaft = createNamedMesh(
      `spare-bolt-${index + 1}-shaft`,
      new CylinderGeometry(0.055, 0.055, 1.7, 8),
      context.materials.wood,
    );
    shaft.rotation.x = Math.PI / 2;
    bolt.add(shaft);
    const tip = createNamedMesh(
      `spare-bolt-${index + 1}-tip`,
      new ConeGeometry(0.15, 0.38, 4),
      context.materials.iron,
    );
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -1.02;
    bolt.add(tip);
    group.add(bolt);
  }
  for (const y of [-0.12, 0.82]) {
    const rack = createNamedMesh(
      `spare-bolt-rack-${y < 0 ? 1 : 2}`,
      new BoxGeometry(0.24, 0.18, 2.05),
      context.materials.iron,
    );
    rack.position.set(-0.1, y, 0);
    group.add(rack);
  }
  return group;
}

export function createTurretAssembly(context: BuildContext): TurretAssembly {
  const root = new Group();
  root.name = 'turret-assembly';
  root.position.y = 0.24;
  const shell = createPartGroup('turret', 'turret-shell', [0, 1.8, 0]);
  root.add(shell);
  const parts = new Map<TurretAssembly['parts'] extends Map<infer Key, Group> ? Key : never, Group>();
  const explodeVectors = new Map<TurretAssembly['explodeVectors'] extends Map<infer Key, readonly [number, number, number]> ? Key : never, readonly [number, number, number]>();

  const lowerStructure = new Group();
  lowerStructure.name = 'pod-lower-structure';
  const podFloor = createNamedMesh(
    'pod-floor',
    new BoxGeometry(3.46, 0.22, 3.36),
    context.materials.iron,
  );
  podFloor.position.y = 0.2;
  const lowerSkirt = createClippedBox(3.86, 0.92, 3.76, 0.34, context.materials.teal);
  lowerSkirt.name = 'lower-armored-skirt';
  lowerSkirt.position.y = 1.0;
  lowerSkirt.userData.explodeWithParent = true;
  const centralYoke = new Group();
  centralYoke.name = 'central-load-yoke';
  const yokeColumn = createNamedMesh(
    'central-load-yoke-column',
    new BoxGeometry(1.02, 1.24, 1.22),
    context.materials.iron,
  );
  yokeColumn.position.y = 0.78;
  const yokeCrossbar = createNamedMesh(
    'central-load-yoke-crossbar',
    new BoxGeometry(2.92, 0.34, 1.02),
    context.materials.iron,
  );
  yokeCrossbar.position.y = 1.3;
  centralYoke.add(yokeColumn, yokeCrossbar);
  const frontClosure = createNamedMesh(
    'front-lower-closure',
    new BoxGeometry(3.5, 0.9, 0.3),
    context.materials.teal,
  );
  frontClosure.position.set(0, 0.68, -1.92);
  const rearClosure = createNamedMesh(
    'rear-lower-closure',
    new BoxGeometry(3.5, 0.82, 0.3),
    context.materials.iron,
  );
  rearClosure.position.set(0, 0.64, 1.88);
  for (const side of [-1, 1]) {
    const lowerStrap = createNamedMesh(
      `lower-skirt-orange-strap-${side < 0 ? 'left' : 'right'}`,
      new BoxGeometry(0.22, 0.72, 0.12),
      context.materials.rust,
    );
    lowerStrap.position.set(side * 1.62, 0.67, -2.1);
    lowerStructure.add(lowerStrap);
  }
  lowerStructure.add(podFloor, lowerSkirt, centralYoke, frontClosure, rearClosure);
  shell.add(lowerStructure);

  const core = createNamedMesh(
    'dark-inner-core',
    new BoxGeometry(3.25, 2.75, 3.45, 2, 2, 2),
    context.materials.iron,
  );
  core.position.y = 1.55;
  const innerCradle = new Group();
  innerCradle.name = 'inner-cradle';
  innerCradle.add(core);
  shell.add(innerCradle);
  const leftArmor = createSideArmor('left-teal-armor', -1, context);
  const rightArmor = createSideArmor('right-teal-armor', 1, context);
  leftArmor.position.y = 0.1;
  rightArmor.position.y = 0.1;
  shell.add(leftArmor, rightArmor);

  const frontPlate = createNamedMesh(
    'front-teal-armor',
    new BoxGeometry(3.5, 1.25, 0.34),
    context.materials.teal,
  );
  frontPlate.position.set(0, 0.84, -1.84);
  shell.add(frontPlate);
  const edgeWear = new Group();
  edgeWear.name = 'armor-edge-wear';
  const frontWear = createNamedMesh(
    'front-left-orange-edge-wear',
    new BoxGeometry(0.16, 1.02, 0.1),
    context.materials.rust,
  );
  frontWear.position.set(-1.72, 0.82, -2.02);
  const sideWear = createNamedMesh(
    'left-side-orange-scar',
    new BoxGeometry(0.1, 0.62, 0.38),
    context.materials.rust,
  );
  sideWear.position.set(-1.96, 1.14, -0.72);
  sideWear.rotation.x = -0.18;
  const upperStrap = createNamedMesh(
    'left-side-dark-reinforcement',
    new BoxGeometry(0.12, 1.22, 0.3),
    context.materials.iron,
  );
  upperStrap.position.set(-1.97, 2.18, 0.72);
  upperStrap.rotation.x = 0.12;
  edgeWear.add(frontWear, sideWear, upperStrap);
  shell.add(edgeWear);
  const topBridge = createNamedMesh(
    'top-dark-bridge',
    new BoxGeometry(3.35, 0.35, 1.12),
    context.materials.iron,
  );
  topBridge.position.set(0, 3.12, 0.2);
  innerCradle.add(topBridge);
  shell.add(createTurretRivets(context));

  const elevationPivot = new Group();
  elevationPivot.name = 'elevation-pivot';
  elevationPivot.position.set(0, 3.28, 0.1);
  elevationPivot.userData.socket = 'weapon-trunnion';
  shell.add(elevationPivot);

  const scope = createScope(context);
  const gauge = createGauge(context);
  const chains = createPartGroup('chains', 'hanging-chains', [-2.1, -1.2, -2.2]);
  for (const [name, x, y] of [
    ['left-chain-anchor', -1.35, 1.38],
    ['right-chain-anchor', 0.78, 1.3],
  ] as const) {
    const anchor = createNamedMesh(
      name,
      new TorusGeometry(0.23, 0.065, 7, 14),
      context.materials.iron,
    );
    anchor.position.set(x, y, -2.06);
    anchor.rotation.y = Math.PI / 2;
    chains.add(anchor);
  }
  const chainLeft = createChain(
    [new Vector3(-1.35, 1.18, -2.08), new Vector3(-1.42, 0.81, -2.2), new Vector3(-0.42, 0.88, -2.12)],
    9,
    context.materials.iron,
  );
  chainLeft.name = 'left-hanging-chain';
  const chainRight = createChain(
    [new Vector3(0.78, 1.1, -2.08), new Vector3(0.56, 0.8, -2.22), new Vector3(1.28, 0.91, -2.1)],
    8,
    context.materials.iron,
  );
  chainRight.name = 'right-hanging-chain';
  chains.add(chainLeft, chainRight);
  const spareBolts = createSpareBolts(context);
  const accessoryAssembly = new Group();
  accessoryAssembly.name = 'accessory-assembly';
  accessoryAssembly.add(scope, gauge, chains, spareBolts);
  shell.add(accessoryAssembly);

  parts.set('turret', shell);
  parts.set('scope', scope);
  parts.set('gauge', gauge);
  parts.set('chains', chains);
  parts.set('spare-bolts', spareBolts);
  explodeVectors.set('turret', [0, 1.8, 0]);
  explodeVectors.set('scope', [-2.4, 1.3, -1.6]);
  explodeVectors.set('gauge', [-2.2, 0.6, 1.2]);
  explodeVectors.set('chains', [-2.1, -1.2, -2.2]);
  explodeVectors.set('spare-bolts', [-2.2, -0.2, 2.2]);

  return { root, elevationPivot, parts, explodeVectors };
}
