import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';

import { createSteampunkBallistaModel } from '../src/model/createSteampunkBallistaModel';
import { PART_IDS, SCULPT_COMPONENT_IDS } from '../src/model/types';

describe('createSteampunkBallistaModel', () => {
  it('assembles every semantic part around animation-ready pivots', () => {
    const model = createSteampunkBallistaModel();

    expect(model.root.name).toBe('steampunk-ballista-turret');
    expect(model.pivots.yaw.name).toBe('yaw-pivot');
    expect(model.pivots.elevation.name).toBe('elevation-pivot');
    expect(model.pivots.loadedBolt.name).toBe('loaded-bolt');
    expect(model.pivots.winch.name).toBe('winch-drum');
    expect(model.pivots.crank.name).toBe('crank');
    expect([...model.parts.keys()].sort()).toEqual([...PART_IDS].sort());
    expect([...model.explodeVectors.keys()].sort()).toEqual([...PART_IDS].sort());

    expect(model.runtime.selectablePartIds).toEqual(PART_IDS);
    expect(Object.keys(model.runtime.nodes).sort()).toEqual([...SCULPT_COMPONENT_IDS].sort());
    expect(Object.keys(model.runtime.meshes).sort()).toEqual([...SCULPT_COMPONENT_IDS].sort());
    expect(Object.keys(model.runtime.colliders).sort()).toEqual([...SCULPT_COMPONENT_IDS].sort());
    expect(Object.keys(model.runtime.destructionGroups).sort()).toEqual([...SCULPT_COMPONENT_IDS].sort());
    expect(new Set(Object.values(model.runtime.nodes)).size).toBe(SCULPT_COMPONENT_IDS.length);
    for (const componentId of SCULPT_COMPONENT_IDS) {
      expect(model.runtime.nodes[componentId].userData.sculptComponentId).toBe(componentId);
      expect(model.runtime.colliders[componentId].componentId).toBe(componentId);
      expect(model.runtime.destructionGroups[componentId]).toContain(model.runtime.nodes[componentId]);
    }
    expect(model.runtime.sockets['yaw-bearing']?.parent).toBe(model.pivots.yaw);
    expect(model.runtime.sockets['weapon-trunnion']?.parent).toBe(model.pivots.elevation);
    expect(model.runtime.sockets['bolt-rail']?.parent).toBe(model.parts.get('rail'));
    expect(model.runtime.sockets['winch-axle']?.parent).toBe(model.pivots.winch);
    expect(model.runtime.nodes['bow-left']).toBe(model.parts.get('bow-left'));
    expect(model.runtime.destructionGroups['bow-left']).toContain(model.parts.get('bow-left'));
    expect(model.runtime.colliders['base-foundation'].type).toBe('box');
    expect(model.root.userData.sculptRuntime).toBe(model.runtime);

    for (const name of [
      'bow-left',
      'bow-right',
      'projectile-rail',
      'loaded-bolt',
      'rear-a-frame',
      'winch-drum',
      'rear-gear',
      'crank',
      'tension-cable',
    ]) {
      expect(model.root.getObjectByName(name), `missing ${name}`).toBeTruthy();
    }

    model.root.traverse((object) => {
      if (object instanceof Mesh) {
        expect(object.name.length, 'every mesh must be named for debugging and selection').toBeGreaterThan(0);
      }
    });
  });

  it('disposes geometries, materials, and generated textures exactly once', () => {
    const model = createSteampunkBallistaModel();
    const geometries = new Set<unknown>();
    const materials = new Set<unknown>();
    model.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => materials.add(material));
    });

    model.dispose();

    expect(geometries.size).toBeGreaterThan(15);
    expect(materials.size).toBeGreaterThan(5);
  });

  it('keeps the rear drive compact while using the full authored bow span', () => {
    const model = createSteampunkBallistaModel();
    const leftAnchor = model.pivots.stringAnchors.left.getWorldPosition(new Vector3());
    const rightAnchor = model.pivots.stringAnchors.right.getWorldPosition(new Vector3());

    expect(model.pivots.winch.position.y).toBeLessThanOrEqual(1.9);
    expect(model.pivots.winch.position.z).toBeLessThanOrEqual(3.5);
    expect(leftAnchor.x).toBeCloseTo(-6.4, 1);
    expect(rightAnchor.x).toBeCloseTo(6.4, 1);
    expect(model.root.getObjectByName('rear-gear')?.getWorldPosition(new Vector3()).x).toBeLessThan(0);
    expect(model.pivots.crank.position.x).toBeLessThan(0);
  });

  it('sweeps loaded bow tips rearward of their mechanical roots', () => {
    const model = createSteampunkBallistaModel();

    for (const side of ['left', 'right'] as const) {
      const root = model.root.getObjectByName(`bow-${side}-root-socket`);
      const tip = model.root.getObjectByName(`bow-${side}-string-anchor`);
      expect(root).toBeTruthy();
      expect(tip).toBeTruthy();
      expect(tip!.getWorldPosition(new Vector3()).z)
        .toBeGreaterThan(root!.getWorldPosition(new Vector3()).z + 1);
    }
  });

  it('aligns each black tip clamp with the terminal white limb segment', () => {
    const model = createSteampunkBallistaModel();

    for (const side of ['left', 'right'] as const) {
      const clamp = model.root.getObjectByName(`bow-${side}-tip-clamp`);
      const anchor = model.root.getObjectByName(`bow-${side}-string-anchor`);
      expect(clamp).toBeTruthy();
      expect(anchor).toBeTruthy();
      expect(clamp!.position.distanceTo(anchor!.position)).toBeLessThan(0.000_001);
      expect(clamp!.position.y).toBeCloseTo(0);
      expect(anchor!.position.y).toBeCloseTo(0);
      expect(Math.abs(clamp!.rotation.z)).toBeLessThan(0.000_001);
      expect(Math.abs(clamp!.rotation.y)).toBeGreaterThan(0.25);
    }
  });

  it('omits visible scope geometry while retaining the semantic runtime part', () => {
    const model = createSteampunkBallistaModel();
    const scope = model.parts.get('scope');
    const meshes: Mesh[] = [];
    scope?.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object);
    });

    expect(scope).toBeTruthy();
    expect(meshes).toHaveLength(0);
    expect(model.root.getObjectByName('scope-main-body')).toBeUndefined();
    expect(model.root.getObjectByName('scope-amber-lens')).toBeUndefined();
  });

  it('exposes dedicated pivots for release, recoil, projectile, and cocking motion', () => {
    const model = createSteampunkBallistaModel();

    for (const name of [
      'recoil-carriage',
      'bow-left-flex-pivot',
      'bow-right-flex-pivot',
      'bow-draw-point',
      'release-latch',
      'launched-bolt',
      'bolt-trail',
      'rear-gear-pivot',
    ]) {
      expect(model.root.getObjectByName(name), `missing ${name}`).toBeTruthy();
    }
  });

  it('physically overlaps the lower pod with the turntable collar', () => {
    const model = createSteampunkBallistaModel();
    const collar = model.root.getObjectByName('yaw-inner-collar');
    const skirt = model.root.getObjectByName('lower-armored-skirt');
    expect(collar).toBeTruthy();
    expect(skirt).toBeTruthy();
    const collarBounds = new Box3().setFromObject(collar!);
    const skirtBounds = new Box3().setFromObject(skirt!);

    expect(skirtBounds.min.y).toBeLessThanOrEqual(collarBounds.max.y + 0.2);
    expect(skirtBounds.max.y).toBeGreaterThan(collarBounds.max.y);
  });
});
