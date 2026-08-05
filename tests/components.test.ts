import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { createBaseAssembly } from '../src/model/components/base';
import { createTurretAssembly } from '../src/model/components/turret';
import { createBallistaMaterials } from '../src/model/materials';
import { BALLISTA_SPEC } from '../src/model/spec';

function createContext() {
  return {
    spec: BALLISTA_SPEC,
    materials: createBallistaMaterials(BALLISTA_SPEC),
  };
}

function unnamedMeshes(root: { traverse: (visitor: (child: unknown) => void) => void }): Mesh[] {
  const unnamed: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh && child.name.length === 0) {
      unnamed.push(child);
    }
  });
  return unnamed;
}

describe('structural assemblies', () => {
  it('builds the clipped armored base and 32-tooth turntable', () => {
    const base = createBaseAssembly(createContext());
    expect(base.root.getObjectByName('base-foundation')).toBeTruthy();
    expect(base.root.getObjectByName('deck-panels')).toBeTruthy();
    expect(base.root.getObjectByName('corner-braces')).toBeTruthy();
    expect(base.root.getObjectByName('turntable-assembly')).toBeTruthy();
    expect(base.root.getObjectByName('mounting-feet')).toBeTruthy();
    expect(base.root.getObjectByName('brass-gear-ring')?.userData.toothCount).toBe(32);
    expect(base.parts.has('base')).toBe(true);
    expect(base.parts.has('turntable')).toBe(true);
    expect(unnamedMeshes(base.root)).toHaveLength(0);
  });

  it('builds the armored turret and all visible accessory clusters', () => {
    const turret = createTurretAssembly(createContext());
    for (const name of [
      'turret-shell',
      'inner-cradle',
      'pod-floor',
      'lower-armored-skirt',
      'central-load-yoke',
      'front-lower-closure',
      'rear-lower-closure',
      'accessory-assembly',
      'scope',
      'pressure-gauge',
      'hanging-chains',
      'left-chain-anchor',
      'right-chain-anchor',
      'spare-bolts',
    ]) {
      expect(turret.root.getObjectByName(name)).toBeTruthy();
    }
    expect(turret.parts.has('turret')).toBe(true);
    expect(turret.parts.has('scope')).toBe(true);
    expect(turret.parts.has('gauge')).toBe(true);
    expect(turret.parts.has('chains')).toBe(true);
    expect(turret.parts.has('spare-bolts')).toBe(true);
    expect(turret.parts.get('scope')?.userData.visualRemoved).toBe(true);
    expect(turret.parts.get('gauge')?.position.x).toBeLessThan(0);
    expect(turret.parts.get('spare-bolts')?.position.x).toBeLessThan(0);
    expect(turret.parts.get('gauge')?.position.z).toBeLessThan(0);
    expect(turret.parts.get('spare-bolts')?.position.z).toBeGreaterThan(0.4);
    expect(unnamedMeshes(turret.root)).toHaveLength(0);
  });

  it('places equal rivet rows on the exterior of both armor faces', () => {
    const turret = createTurretAssembly(createContext());
    const rivets = turret.root.getObjectByName('turret-panel-rivets');
    const leftArmor = turret.root.getObjectByName('left-teal-armor');
    const rightArmor = turret.root.getObjectByName('right-teal-armor');
    expect(rivets).toBeInstanceOf(InstancedMesh);
    expect(leftArmor).toBeTruthy();
    expect(rightArmor).toBeTruthy();

    turret.root.updateWorldMatrix(true, true);
    const instance = new Matrix4();
    const positions: Vector3[] = [];
    for (let index = 0; index < (rivets as InstancedMesh).count; index += 1) {
      (rivets as InstancedMesh).getMatrixAt(index, instance);
      positions.push(new Vector3().setFromMatrixPosition(instance).applyMatrix4(rivets!.matrixWorld));
    }
    const leftRivets = positions.filter((position) => position.x < 0);
    const rightRivets = positions.filter((position) => position.x > 0);
    const leftBounds = new Box3().setFromObject(leftArmor!);
    const rightBounds = new Box3().setFromObject(rightArmor!);

    expect(leftRivets).toHaveLength(8);
    expect(rightRivets).toHaveLength(8);
    expect(Math.max(...leftRivets.map((position) => position.x))).toBeLessThanOrEqual(leftBounds.min.x + 0.02);
    expect(Math.min(...rightRivets.map((position) => position.x))).toBeGreaterThanOrEqual(rightBounds.max.x - 0.021);
  });

  it('keeps every hanging chain link above the pod floor', () => {
    const turret = createTurretAssembly(createContext());
    const chains = turret.root.getObjectByName('hanging-chains');
    const floor = turret.root.getObjectByName('pod-floor');
    expect(chains).toBeTruthy();
    expect(floor).toBeTruthy();

    const chainBounds = new Box3().setFromObject(chains!);
    const floorBounds = new Box3().setFromObject(floor!);
    expect(chainBounds.min.y).toBeGreaterThan(floorBounds.max.y + 0.08);
  });
});
