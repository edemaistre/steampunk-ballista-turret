import { Box3, Group, Mesh, Object3D, Vector3, type Material, type Texture } from 'three';

import { createBaseAssembly } from './components/base';
import { createTurretAssembly } from './components/turret';
import { createWeaponAssembly } from './components/weapon';
import { createBallistaMaterials } from './materials';
import { BALLISTA_SPEC } from './spec';
import { PART_IDS } from './types';
import type {
  BallistaBuildOptions,
  BallistaColliderProxy,
  BallistaModel,
  BallistaRuntime,
  PartId,
  SculptComponentId,
} from './types';

function createSocket(
  socketId: string,
  parent: Group,
  position: readonly [number, number, number] = [0, 0, 0],
): Object3D {
  const socket = new Object3D();
  socket.name = `socket-${socketId}`;
  socket.userData.socketId = socketId;
  socket.position.set(...position);
  parent.add(socket);
  return socket;
}

function requiredObject(root: Object3D, name: string): Object3D {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`Missing sculpt component node: ${name}`);
  return object;
}

function collectComponentMeshes(componentId: SculptComponentId, node: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  const visit = (object: Object3D): void => {
    if (
      object !== node
      && object.userData.sculptComponentId
      && object.userData.sculptComponentId !== componentId
    ) return;
    if (object instanceof Mesh) meshes.push(object);
    object.children.forEach(visit);
  };
  visit(node);
  return meshes;
}

function sculptRecord<T>(
  entries: Iterable<readonly [SculptComponentId, T]>,
): Record<SculptComponentId, T> {
  return Object.fromEntries(entries) as unknown as Record<SculptComponentId, T>;
}

function createColliderProxy(
  componentId: SculptComponentId,
  node: Object3D,
): BallistaColliderProxy {
  const bounds = new Box3().setFromObject(node);
  const size = bounds.isEmpty() ? new Vector3(0.1, 0.1, 0.1) : bounds.getSize(new Vector3());
  const worldCenter = bounds.isEmpty()
    ? node.getWorldPosition(new Vector3())
    : bounds.getCenter(new Vector3());
  const localCenter = node.worldToLocal(worldCenter.clone());
  const cylindrical = new Set<SculptComponentId>([
    'turntable-assembly',
    'yaw-track',
    'turntable',
    'winch-drum',
    'rear-gear',
  ]).has(componentId);
  return {
    type: cylindrical ? 'cylinder' : 'box',
    componentId,
    size: [size.x, size.y, size.z],
    offset: [localCenter.x, localCenter.y, localCenter.z],
    isTrigger: false,
  };
}

export function createSteampunkBallistaModel(
  _options: BallistaBuildOptions = {},
): BallistaModel {
  const root = new Group();
  root.name = 'steampunk-ballista-turret';
  const materials = createBallistaMaterials(BALLISTA_SPEC);
  const context = { spec: BALLISTA_SPEC, materials };

  const base = createBaseAssembly(context);
  const turret = createTurretAssembly(context);
  const weapon = createWeaponAssembly(context);
  base.yawPivot.add(turret.root);
  turret.elevationPivot.add(weapon.root);
  root.add(base.root);

  const parts = new Map<PartId, Group>([
    ...base.parts,
    ...turret.parts,
    ...weapon.parts,
  ]);
  const explodeVectors = new Map<PartId, readonly [number, number, number]>([
    ...base.explodeVectors,
    ...turret.explodeVectors,
    ...weapon.explodeVectors,
  ]);

  const sockets: Record<string, Object3D> = {
    'yaw-bearing': createSocket('yaw-bearing', base.yawPivot),
    'weapon-trunnion': createSocket('weapon-trunnion', turret.elevationPivot),
    'bolt-rail': createSocket('bolt-rail', weapon.parts.get('rail') ?? weapon.root, [0, 0.56, -4.8]),
    'winch-axle': createSocket('winch-axle', weapon.winch),
  };
  const nodes: Record<SculptComponentId, Object3D> = {
    root,
    'base-assembly': base.root,
    'turntable-assembly': requiredObject(root, 'turntable-assembly'),
    'turret-assembly': turret.root,
    'weapon-assembly': weapon.root,
    'accessory-assembly': requiredObject(root, 'accessory-assembly'),
    'base-foundation': requiredObject(root, 'base-foundation'),
    'deck-panels': requiredObject(root, 'deck-panels'),
    'corner-braces': requiredObject(root, 'corner-braces'),
    'yaw-track': requiredObject(root, 'yaw-track'),
    turntable: parts.get('turntable') ?? requiredObject(root, 'yaw-pivot'),
    'turret-shell': parts.get('turret') ?? requiredObject(root, 'turret-shell'),
    'inner-cradle': requiredObject(root, 'inner-cradle'),
    'bow-assembly': requiredObject(root, 'bow-assembly'),
    'bow-left': parts.get('bow-left') ?? requiredObject(root, 'bow-left'),
    'bow-right': parts.get('bow-right') ?? requiredObject(root, 'bow-right'),
    'projectile-rail': parts.get('rail') ?? requiredObject(root, 'projectile-rail'),
    'loaded-bolt': parts.get('bolt') ?? requiredObject(root, 'loaded-bolt'),
    'support-frame': requiredObject(root, 'rear-a-frame'),
    'winch-drum': parts.get('winch') ?? requiredObject(root, 'winch-drum'),
    'rear-gear': requiredObject(root, 'rear-gear'),
    crank: parts.get('crank') ?? requiredObject(root, 'crank'),
    'tension-cable': requiredObject(root, 'tension-cable'),
    scope: parts.get('scope') ?? requiredObject(root, 'scope'),
    gauge: parts.get('gauge') ?? requiredObject(root, 'pressure-gauge'),
    'hanging-chains': parts.get('chains') ?? requiredObject(root, 'hanging-chains'),
    'spare-bolts': parts.get('spare-bolts') ?? requiredObject(root, 'spare-bolts'),
    'mounting-feet': requiredObject(root, 'mounting-feet'),
  };
  for (const [componentId, node] of Object.entries(nodes) as [SculptComponentId, Object3D][]) {
    node.userData.sculptComponentId = componentId;
  }
  root.updateWorldMatrix(true, true);
  const componentEntries = Object.entries(nodes) as [SculptComponentId, Object3D][];
  const meshes = sculptRecord(
    componentEntries.map(([componentId, node]) => [
      componentId,
      collectComponentMeshes(componentId, node),
    ]),
  );
  const colliders = sculptRecord(
    componentEntries.map(([componentId, node]) => [
      componentId,
      createColliderProxy(componentId, node),
    ]),
  );
  const destructionGroups = sculptRecord(
    componentEntries.map(([componentId, node]) => [componentId, [node]]),
  );
  const runtime: BallistaRuntime = {
    version: 1,
    selectablePartIds: PART_IDS,
    nodes,
    meshes,
    sockets,
    colliders,
    destructionGroups,
  };
  root.userData.sculptRuntime = runtime;

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<Mesh['geometry']>();
    const materialSet = new Set<Material>();
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => materialSet.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    const textures = new Set<Texture>();
    materialSet.forEach((material) => {
      for (const value of Object.values(material)) {
        if (value && typeof value === 'object' && 'isTexture' in value) {
          textures.add(value as Texture);
        }
      }
      material.dispose();
    });
    textures.forEach((texture) => texture.dispose());
  };

  return {
    root,
    runtime,
    parts,
    explodeVectors,
    pivots: {
      yaw: base.yawPivot,
      elevation: turret.elevationPivot,
      loadedBolt: weapon.loadedBolt,
      winch: weapon.winch,
      crank: weapon.crank,
      rearGear: weapon.rearGear,
      recoilCarriage: weapon.recoilCarriage,
      leftLimbFlex: weapon.leftLimbFlex,
      rightLimbFlex: weapon.rightLimbFlex,
      drawPoint: weapon.drawPoint,
      releaseLatch: weapon.releaseLatch,
      launchedBolt: weapon.launchedBolt,
      boltTrail: weapon.boltTrail,
      stringAnchors: weapon.stringAnchors,
      refreshStrings: weapon.refreshStrings,
    },
    dispose,
  };
}
