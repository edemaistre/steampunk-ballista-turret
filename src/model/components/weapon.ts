import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  TorusGeometry,
  Vector3,
} from 'three';

import { createBeamBetween, createGearRing } from '../geometry';
import type { PartId } from '../types';
import { createNamedMesh, createPartGroup, type AssemblyResult, type BuildContext } from './shared';

export interface WeaponAssembly extends AssemblyResult {
  readonly loadedBolt: Group;
  readonly winch: Group;
  readonly crank: Group;
  readonly rearGear: Group;
  readonly recoilCarriage: Group;
  readonly leftLimbFlex: Group;
  readonly rightLimbFlex: Group;
  readonly drawPoint: Group;
  readonly releaseLatch: Group;
  readonly launchedBolt: Group;
  readonly boltTrail: Mesh;
  readonly stringAnchors: {
    readonly left: Group;
    readonly center: Group;
    readonly right: Group;
  };
  readonly refreshStrings: () => void;
}

function alignCableSegment(mesh: Mesh, start: Vector3, end: Vector3): void {
  const direction = end.clone().sub(start);
  const length = Math.max(direction.length(), 0.001);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
}

function createCableSegment(name: string, context: BuildContext, radius = 0.055): Mesh {
  const segment = createNamedMesh(
    name,
    new CylinderGeometry(radius, radius, 1, 7),
    context.materials.cable,
  );
  segment.castShadow = false;
  return segment;
}

function addFacetedBow(
  side: -1 | 1,
  context: BuildContext,
): { part: Group; flex: Group; tip: Group; rootSocket: Group } {
  const id: PartId = side < 0 ? 'bow-left' : 'bow-right';
  const part = createPartGroup(id, id, [side * 4.2, 0.3, -0.6]);
  part.position.set(side * 0.42, 0.03, -2.5);
  const flex = new Group();
  flex.name = `${id}-flex-pivot`;
  const points = [
    new Vector3(0, 0, 0),
    new Vector3(side * 0.82, -0.01, 0.08),
    new Vector3(side * 1.78, -0.04, 0.27),
    new Vector3(side * 2.86, -0.08, 0.58),
    new Vector3(side * 4.02, -0.13, 1.0),
    new Vector3(side * 5.1, -0.2, 1.46),
    new Vector3(side * 5.98, -0.28, 1.82),
  ];
  const halfWidths = [0.43, 0.44, 0.42, 0.38, 0.33, 0.27, 0.2];
  const limbShape = new Shape();
  points.forEach((point, index) => {
    const halfWidth = halfWidths[index] ?? 0.24;
    const shapeY = -(point.z - halfWidth);
    if (index === 0) limbShape.moveTo(point.x, shapeY);
    else limbShape.lineTo(point.x, shapeY);
  });
  [...points].reverse().forEach((point, reverseIndex) => {
    const index = points.length - 1 - reverseIndex;
    const halfWidth = halfWidths[index] ?? 0.24;
    limbShape.lineTo(point.x, -(point.z + halfWidth));
  });
  limbShape.closePath();
  const limbGeometry = new ExtrudeGeometry(limbShape, {
    depth: 0.58,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.07,
    bevelThickness: 0.055,
  });
  limbGeometry.rotateX(-Math.PI / 2);
  limbGeometry.translate(0, -0.29, 0);
  limbGeometry.computeVertexNormals();
  const limb = createNamedMesh(`${id}-faceted-limb`, limbGeometry, context.materials.wood);
  flex.add(limb);

  const rootClamp = createNamedMesh(
    `${id}-root-clamp`,
    new BoxGeometry(0.88, 0.98, 0.78),
    context.materials.iron,
  );
  rootClamp.rotation.z = side * 0.12;
  part.add(rootClamp);

  const rootBand = createNamedMesh(
    `${id}-root-brass-band`,
    new BoxGeometry(0.26, 1.05, 0.86),
    context.materials.brass,
  );
  rootBand.position.x = side * 0.42;
  flex.add(rootBand);

  const tipClamp = createNamedMesh(
    `${id}-tip-clamp`,
    new BoxGeometry(0.46, 0.68, 0.58),
    context.materials.iron,
  );
  const terminalPoint = (points.at(-1) ?? new Vector3()).clone();
  terminalPoint.y = 0;
  tipClamp.position.copy(terminalPoint);
  const terminalDirection = (points.at(-1) ?? new Vector3())
    .clone()
    .sub(points.at(-2) ?? new Vector3())
    .normalize();
  tipClamp.rotation.y = -side * Math.atan2(terminalDirection.z, Math.abs(terminalDirection.x));
  flex.add(tipClamp);

  const tip = new Group();
  tip.name = `${id}-string-anchor`;
  tip.position.copy(terminalPoint);
  tip.userData.explodeWithParent = true;
  flex.add(tip);

  const rootSocket = new Group();
  rootSocket.name = `${id}-root-socket`;
  rootSocket.userData.explodeWithParent = true;
  part.add(rootSocket, flex);
  return { part, flex, tip, rootSocket };
}

function createProjectileRail(context: BuildContext): Group {
  const rail = createPartGroup('rail', 'projectile-rail', [0, 0.8, -2.6]);
  const tealBody = createNamedMesh(
    'rail-teal-body',
    new BoxGeometry(2.0, 0.72, 8.8, 2, 1, 4),
    context.materials.teal,
  );
  tealBody.position.z = -0.3;
  rail.add(tealBody);

  const guide = createNamedMesh(
    'rail-wood-guide',
    new BoxGeometry(0.54, 0.18, 10.2, 1, 1, 6),
    context.materials.wood,
  );
  guide.position.set(0, 0.47, -0.92);
  rail.add(guide);

  for (const side of [-1, 1]) {
    const edge = createNamedMesh(
      `rail-dark-edge-${side < 0 ? 'left' : 'right'}`,
      new BoxGeometry(0.2, 0.32, 9.35),
      context.materials.iron,
    );
    edge.position.set(side * 0.93, 0.35, -0.5);
    rail.add(edge);
  }

  const muzzle = createNamedMesh(
    'rail-front-cap',
    new BoxGeometry(2.28, 0.96, 0.48),
    context.materials.iron,
  );
  muzzle.position.set(0, 0.02, -4.76);
  rail.add(muzzle);
  return rail;
}

function addBoltVisual(bolt: Group, prefix: string, context: BuildContext): void {
  const shaft = createNamedMesh(
    `${prefix}-shaft`,
    new CylinderGeometry(0.095, 0.095, 9.1, 8),
    context.materials.wood,
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.5;
  bolt.add(shaft);

  const head = createNamedMesh(
    `${prefix}-spearhead`,
    new ConeGeometry(0.3, 0.88, 4),
    context.materials.iron,
  );
  head.rotation.x = -Math.PI / 2;
  head.position.z = -5.42;
  bolt.add(head);

  for (const side of [-1, 1]) {
    const fletching = createNamedMesh(
      `${prefix}-fletching-${side < 0 ? 'left' : 'right'}`,
      new BoxGeometry(0.42, 0.26, 0.72),
      context.materials.iron,
    );
    fletching.position.set(side * 0.22, 0, 3.67);
    fletching.rotation.z = side * 0.2;
    bolt.add(fletching);
  }
}

function createLoadedBolt(context: BuildContext): Group {
  const bolt = createPartGroup('bolt', 'loaded-bolt', [0, 1.0, -5.8]);
  bolt.position.set(0, 0.85, -0.78);
  addBoltVisual(bolt, 'loaded-bolt', context);
  return bolt;
}

function createProjectileEffects(context: BuildContext): {
  group: Group;
  launchedBolt: Group;
  boltTrail: Mesh;
} {
  const group = new Group();
  group.name = 'projectile-effects';
  const launchedBolt = new Group();
  launchedBolt.name = 'launched-bolt';
  launchedBolt.position.set(0, 0.85, -0.78);
  launchedBolt.visible = false;
  launchedBolt.userData.explodeWithParent = true;
  addBoltVisual(launchedBolt, 'launched-bolt', context);

  const trailMaterial = context.materials.lens.clone();
  trailMaterial.name = 'bolt-speed-trail';
  trailMaterial.transparent = true;
  trailMaterial.opacity = 0;
  trailMaterial.depthWrite = false;
  trailMaterial.emissiveIntensity = 1.1;
  const boltTrail = createNamedMesh(
    'bolt-trail',
    new CylinderGeometry(0.025, 0.2, 3.4, 7, 1, true),
    trailMaterial,
  );
  boltTrail.rotation.x = Math.PI / 2;
  boltTrail.position.set(0, 0.85, 2.25);
  boltTrail.visible = false;
  boltTrail.castShadow = false;
  group.add(launchedBolt, boltTrail);
  return { group, launchedBolt, boltTrail };
}

function createRearFrame(context: BuildContext): Group {
  const frame = new Group();
  frame.name = 'rear-a-frame';
  const beamPairs = [
    [new Vector3(-1.05, 0.1, 2.3), new Vector3(-2.35, 1.82, 3.45)],
    [new Vector3(1.05, 0.1, 2.3), new Vector3(2.35, 1.82, 3.45)],
    [new Vector3(-2.35, 1.82, 3.45), new Vector3(2.35, 1.82, 3.45)],
  ] as const;
  beamPairs.forEach(([start, end], index) => {
    const beam = createBeamBetween(start, end, index === 2 ? 0.4 : 0.46, context.materials.iron);
    beam.name = `rear-a-frame-beam-${index + 1}`;
    frame.add(beam);
  });
  for (const side of [-1, 1]) {
    const pivot = createNamedMesh(
      `rear-frame-pivot-${side < 0 ? 'left' : 'right'}`,
      new CylinderGeometry(0.36, 0.36, 0.26, 12),
      context.materials.rust,
    );
    pivot.rotation.z = Math.PI / 2;
    pivot.position.set(side * 2.38, 1.82, 3.45);
    frame.add(pivot);
  }
  return frame;
}

function createWinch(context: BuildContext): { winch: Group; rearGear: Group } {
  const winch = createPartGroup('winch', 'winch-drum', [0, 1.7, 3.2]);
  winch.position.set(0, 1.7, 3.18);
  const core = createNamedMesh(
    'winch-cable-drum',
    new CylinderGeometry(0.7, 0.7, 2.42, 14),
    context.materials.cable,
  );
  core.rotation.z = Math.PI / 2;
  winch.add(core);

  for (const side of [-1, 1]) {
    const flange = createNamedMesh(
      `winch-flange-${side < 0 ? 'left' : 'right'}`,
      new CylinderGeometry(0.98, 0.98, 0.24, 14),
      context.materials.iron,
    );
    flange.rotation.z = Math.PI / 2;
    flange.position.x = side * 1.28;
    winch.add(flange);
  }

  for (let index = 0; index < 11; index += 1) {
    const ropeRidge = createNamedMesh(
      `winch-rope-ridge-${index + 1}`,
      new TorusGeometry(0.73, 0.035, 5, 16),
      context.materials.cable,
    );
    ropeRidge.rotation.y = Math.PI / 2;
    ropeRidge.position.x = -1.05 + index * 0.21;
    winch.add(ropeRidge);
  }

  const rearGear = new Group();
  rearGear.name = 'rear-gear-pivot';
  rearGear.position.set(-1.62, 1.7, 3.18);
  rearGear.userData.explodeWithParent = true;
  const gear = createGearRing(
    { radius: 1.08, toothCount: 18, toothSize: [0.33, 0.26, 0.42], tube: 0.2 },
    context.materials.brass,
  );
  gear.name = 'rear-gear';
  gear.rotation.z = Math.PI / 2;
  gear.userData.explodeWithParent = true;
  const hub = createNamedMesh(
    'rear-gear-steel-hub',
    new CylinderGeometry(0.42, 0.48, 0.52, 12),
    context.materials.iron,
  );
  hub.rotation.z = Math.PI / 2;
  const axleCap = createNamedMesh(
    'rear-gear-brass-axle-cap',
    new CylinderGeometry(0.24, 0.24, 0.6, 12),
    context.materials.brass,
  );
  axleCap.rotation.z = Math.PI / 2;
  axleCap.position.x = -0.18;
  rearGear.add(gear, hub, axleCap);
  return { winch, rearGear };
}

function createCrank(context: BuildContext): Group {
  const crank = createPartGroup('crank', 'crank', [-2.8, 0.3, 3.4]);
  crank.position.set(-2.02, 1.7, 3.18);
  const axle = createNamedMesh(
    'crank-axle',
    new CylinderGeometry(0.16, 0.16, 0.72, 10),
    context.materials.iron,
  );
  axle.rotation.z = Math.PI / 2;
  axle.position.x = -0.3;
  crank.add(axle);

  const hub = createNamedMesh(
    'crank-brass-hub',
    new CylinderGeometry(0.31, 0.35, 0.26, 12),
    context.materials.brass,
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.x = -0.62;
  crank.add(hub);

  const arm = createBeamBetween(new Vector3(-0.62, 0, 0), new Vector3(-0.62, -1.18, 0), 0.24, context.materials.iron);
  arm.name = 'crank-arm';
  crank.add(arm);

  const grip = createNamedMesh(
    'crank-wood-grip',
    new CylinderGeometry(0.19, 0.23, 0.96, 10),
    context.materials.wood,
  );
  grip.rotation.z = Math.PI / 2;
  grip.position.set(-1.06, -1.18, 0);
  crank.add(grip);
  return crank;
}

function createTensionRig(
  anchors: WeaponAssembly['stringAnchors'],
  winchAnchor: Group,
  context: BuildContext,
): { group: Group; refresh: () => void } {
  const group = new Group();
  group.name = 'tension-cable';
  const leftString = createCableSegment('bowstring-left-segment', context, 0.065);
  const rightString = createCableSegment('bowstring-right-segment', context, 0.065);
  const winchCable = createCableSegment('winch-draw-cable', context, 0.05);
  group.add(leftString, rightString, winchCable);

  const refresh = (): void => {
    group.updateWorldMatrix(true, false);
    const left = group.worldToLocal(anchors.left.getWorldPosition(new Vector3()));
    const center = group.worldToLocal(anchors.center.getWorldPosition(new Vector3()));
    const right = group.worldToLocal(anchors.right.getWorldPosition(new Vector3()));
    const winch = group.worldToLocal(winchAnchor.getWorldPosition(new Vector3()));
    alignCableSegment(leftString, left, center);
    alignCableSegment(rightString, center, right);
    alignCableSegment(winchCable, center, winch);
  };
  return { group, refresh };
}

export function createWeaponAssembly(context: BuildContext): WeaponAssembly {
  const root = new Group();
  root.name = 'weapon-assembly';
  root.rotation.x = -0.055;
  const parts = new Map<PartId, Group>();
  const explodeVectors = new Map<PartId, readonly [number, number, number]>();

  const left = addFacetedBow(-1, context);
  const right = addFacetedBow(1, context);
  const rail = createProjectileRail(context);
  const loadedBolt = createLoadedBolt(context);
  const rearFrame = createRearFrame(context);
  const drive = createWinch(context);
  const crank = createCrank(context);
  const projectileEffects = createProjectileEffects(context);

  const recoilCarriage = new Group();
  recoilCarriage.name = 'recoil-carriage';
  const drawPoint = new Group();
  drawPoint.name = 'bow-draw-point';
  drawPoint.position.set(0, 0.66, 2.58);
  drawPoint.userData.explodeWithParent = true;
  const releaseLatch = new Group();
  releaseLatch.name = 'release-latch';
  releaseLatch.position.set(0, 0.48, 2.48);
  releaseLatch.userData.explodeWithParent = true;
  const latchBody = createNamedMesh(
    'release-latch-body',
    new BoxGeometry(0.56, 0.34, 0.72),
    context.materials.brass,
  );
  const latchPin = createNamedMesh(
    'release-latch-pin',
    new CylinderGeometry(0.12, 0.12, 0.72, 10),
    context.materials.iron,
  );
  latchPin.rotation.z = Math.PI / 2;
  releaseLatch.add(latchBody, latchPin);

  const stringAnchors = { left: left.tip, center: drawPoint, right: right.tip };

  const bowAssembly = new Group();
  bowAssembly.name = 'bow-assembly';
  bowAssembly.add(left.part, right.part);
  recoilCarriage.add(rail, bowAssembly, loadedBolt, drawPoint, releaseLatch);

  const cockingAssembly = new Group();
  cockingAssembly.name = 'cocking-assembly';
  cockingAssembly.add(drive.winch, drive.rearGear, crank);
  const winchAnchor = new Group();
  winchAnchor.name = 'winch-cable-anchor';
  drive.winch.add(winchAnchor);

  root.add(recoilCarriage, rearFrame, cockingAssembly, projectileEffects.group);
  const tensionRig = createTensionRig(stringAnchors, winchAnchor, context);
  recoilCarriage.add(tensionRig.group);
  for (const [id, part, vector] of [
    ['rail', rail, [0, 0.8, -2.6]],
    ['bow-left', left.part, [-4.2, 0.3, -0.6]],
    ['bow-right', right.part, [4.2, 0.3, -0.6]],
    ['bolt', loadedBolt, [0, 1.0, -5.8]],
    ['winch', drive.winch, [0, 1.7, 3.2]],
    ['crank', crank, [-2.8, 0.3, 3.4]],
  ] as const) {
    parts.set(id, part);
    explodeVectors.set(id, vector);
  }

  const trunnion = createNamedMesh(
    'weapon-trunnion-axle',
    new CylinderGeometry(0.42, 0.42, 4.35, 16),
    context.materials.iron,
  );
  trunnion.rotation.z = Math.PI / 2;
  root.add(trunnion);
  for (const side of [-1, 1]) {
    const cap = createNamedMesh(
      `trunnion-cap-${side < 0 ? 'left' : 'right'}`,
      new CylinderGeometry(0.48, 0.48, 0.3, 12),
      context.materials.iron,
    );
    cap.position.x = side * 2.24;
    cap.rotation.z = Math.PI / 2;
    const hub = createNamedMesh(
      `trunnion-hub-${side < 0 ? 'left' : 'right'}`,
      new CylinderGeometry(0.22, 0.22, 0.36, 12),
      context.materials.brass,
    );
    hub.position.x = side * 2.42;
    hub.rotation.z = Math.PI / 2;
    root.add(cap, hub);
  }

  const cableGuide = createNamedMesh(
    'winch-cable-guide',
    new TorusGeometry(0.5, 0.1, 6, 18, Math.PI),
    context.materials.brass,
  );
  cableGuide.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  cableGuide.position.set(0, 1.0, 2.32);
  root.add(cableGuide);

  tensionRig.refresh();

  return {
    root,
    parts,
    explodeVectors,
    loadedBolt,
    winch: drive.winch,
    crank,
    rearGear: drive.rearGear,
    recoilCarriage,
    leftLimbFlex: left.flex,
    rightLimbFlex: right.flex,
    drawPoint,
    releaseLatch,
    launchedBolt: projectileEffects.launchedBolt,
    boltTrail: projectileEffects.boltTrail,
    stringAnchors,
    refreshStrings: tensionRig.refresh,
  };
}
