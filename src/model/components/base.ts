import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

import { createClippedBox, createGearRing } from '../geometry';
import { createNamedMesh, createPartGroup, type AssemblyResult, type BuildContext } from './shared';

export interface BaseAssembly extends AssemblyResult {
  readonly yawPivot: Group;
}

function createFoundationRivets(context: BuildContext): InstancedMesh {
  const countPerSide = 12;
  const rivets = new InstancedMesh(
    new SphereGeometry(0.085, 8, 5),
    context.materials.iron,
    countPerSide * 4,
  );
  rivets.name = 'foundation-rivets';
  rivets.castShadow = true;
  rivets.userData.explodeWithParent = true;
  const matrix = new Matrix4();
  const scale = new Vector3(1, 0.65, 1);
  let index = 0;
  for (let side = 0; side < 4; side += 1) {
    for (let step = 0; step < countPerSide; step += 1) {
      const offset = -4 + (step / (countPerSide - 1)) * 8;
      const position = side === 0
        ? new Vector3(offset, 0.55, -5.03)
        : side === 1
          ? new Vector3(5.03, 0.55, offset)
          : side === 2
            ? new Vector3(-offset, 0.55, 5.03)
            : new Vector3(-5.03, 0.55, -offset);
      matrix.makeScale(scale.x, scale.y, scale.z);
      matrix.setPosition(position);
      rivets.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  rivets.instanceMatrix.needsUpdate = true;
  return rivets;
}

export function createBaseAssembly(context: BuildContext): BaseAssembly {
  const root = new Group();
  root.name = 'base-assembly';

  const parts = new Map<BaseAssembly['parts'] extends Map<infer Key, Group> ? Key : never, Group>();
  const explodeVectors = new Map<BaseAssembly['explodeVectors'] extends Map<infer Key, readonly [number, number, number]> ? Key : never, readonly [number, number, number]>();

  const basePart = createPartGroup('base', 'base-foundation', [0, -0.9, 0]);
  const foundation = createClippedBox(10, 0.9, 10, 0.9, context.materials.iron);
  foundation.name = 'foundation-armored-shell';
  foundation.position.y = 0.48;
  basePart.add(foundation);

  const lowerBand = createClippedBox(9.72, 0.24, 9.72, 0.82, context.materials.iron);
  lowerBand.name = 'foundation-lower-band';
  lowerBand.position.y = 0.16;
  basePart.add(lowerBand);

  const deck = new Group();
  deck.name = 'deck-panels';
  const panelPositions = [
    [-2.38, -2.38],
    [2.38, -2.38],
    [-2.38, 2.38],
    [2.38, 2.38],
  ] as const;
  panelPositions.forEach(([x, z], index) => {
    const panel = createClippedBox(4.62, 0.18, 4.62, 0.52, context.materials.teal);
    panel.name = `teal-deck-panel-${index + 1}`;
    panel.position.set(x, 1.0, z);
    panel.userData.explodeWithParent = true;
    deck.add(panel);
  });
  basePart.add(deck);

  const cornerBraces = new Group();
  cornerBraces.name = 'corner-braces';
  const bracePositions = [
    [-4.58, -4.58, Math.PI / 4],
    [4.58, -4.58, -Math.PI / 4],
    [4.58, 4.58, Math.PI / 4],
    [-4.58, 4.58, -Math.PI / 4],
  ] as const;
  bracePositions.forEach(([x, z, rotation], index) => {
    const brace = createNamedMesh(
      `orange-corner-brace-${index + 1}`,
      new BoxGeometry(1.18, 0.7, 0.24, 2, 1, 1),
      context.materials.rust,
    );
    brace.position.set(x, 0.56, z);
    brace.rotation.y = rotation;
    cornerBraces.add(brace);
    for (const offset of [-0.3, 0.3]) {
      const bolt = createNamedMesh(
        `corner-brace-${index + 1}-bolt-${offset < 0 ? 1 : 2}`,
        new SphereGeometry(0.09, 8, 5),
        context.materials.iron,
      );
      bolt.position.set(offset, 0.13, 0.14);
      brace.add(bolt);
    }
  });
  basePart.add(cornerBraces, createFoundationRivets(context));
  root.add(basePart);
  parts.set('base', basePart);
  explodeVectors.set('base', [0, -0.9, 0]);

  const yawPivot = createPartGroup('turntable', 'yaw-pivot', [0, 1.25, 0]);
  yawPivot.position.y = 1.14;
  const bearing = createNamedMesh(
    'yaw-bearing-plate',
    new CylinderGeometry(3.48, 3.62, 0.26, 48),
    context.materials.iron,
  );
  bearing.position.y = 0.04;
  yawPivot.add(bearing);

  const track = createNamedMesh(
    'yaw-track',
    new TorusGeometry(3.72, 0.16, 8, 64),
    context.materials.iron,
  );
  track.rotation.x = Math.PI / 2;
  track.position.y = 0.18;
  yawPivot.add(track);

  const gearRing = createGearRing(
    { radius: 3.28, toothCount: 32, toothSize: [0.34, 0.3, 0.54], tube: 0.12 },
    context.materials.brass,
  );
  gearRing.name = 'brass-gear-ring';
  gearRing.position.y = 0.28;
  gearRing.userData.explodeWithParent = true;
  yawPivot.add(gearRing);

  const innerCollar = new Mesh(
    new CylinderGeometry(2.62, 2.72, 0.32, 40),
    context.materials.iron,
  );
  innerCollar.name = 'yaw-inner-collar';
  innerCollar.position.y = 0.34;
  innerCollar.castShadow = true;
  innerCollar.receiveShadow = true;
  innerCollar.userData.explodeWithParent = true;
  yawPivot.add(innerCollar);

  const turntableAssembly = new Group();
  turntableAssembly.name = 'turntable-assembly';
  turntableAssembly.add(yawPivot);
  root.add(turntableAssembly);
  parts.set('turntable', yawPivot);
  explodeVectors.set('turntable', [0, 1.25, 0]);

  const mountingFeet = new Group();
  mountingFeet.name = 'mounting-feet';
  const mountingFootPositions = [
    [-4.1, -4.1],
    [4.1, -4.1],
    [4.1, 4.1],
    [-4.1, 4.1],
  ] as const;
  for (const [index, [x, z]] of mountingFootPositions.entries()) {
    const foot = createNamedMesh(
      `mounting-foot-${index + 1}`,
      new BoxGeometry(1.1, 0.22, 1.1),
      context.materials.iron,
    );
    foot.position.set(x, 0.05, z);
    mountingFeet.add(foot);
  }
  root.add(mountingFeet);

  return { root, yawPivot, parts, explodeVectors };
}
