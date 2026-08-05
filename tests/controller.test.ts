import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';

import { BallistaController } from '../src/interaction/BallistaController';
import { createSteampunkBallistaModel } from '../src/model/createSteampunkBallistaModel';

describe('BallistaController', () => {
  it('allows yaw across the full -180 to +180 degree range', () => {
    const model = createSteampunkBallistaModel();
    const controller = new BallistaController(model);

    controller.setYawDegrees(250);
    expect(model.pivots.yaw.rotation.y).toBeCloseTo(Math.PI);

    controller.setYawDegrees(-250);
    expect(model.pivots.yaw.rotation.y).toBeCloseTo(-Math.PI);
  });

  it('uses a symmetric pitch range where positive values raise the bolt', () => {
    const model = createSteampunkBallistaModel();
    const controller = new BallistaController(model);

    expect(controller.setElevationDegrees(90)).toBe(20);
    expect(model.pivots.elevation.rotation.x).toBeCloseTo((20 * Math.PI) / 180);
    expect(new Vector3(0, 0, -1).applyQuaternion(model.pivots.elevation.quaternion).y).toBeGreaterThan(0);

    expect(controller.setElevationDegrees(-90)).toBe(-20);
    expect(model.pivots.elevation.rotation.x).toBeCloseTo((-20 * Math.PI) / 180);
    expect(new Vector3(0, 0, -1).applyQuaternion(model.pivots.elevation.quaternion).y).toBeLessThan(0);

    expect(controller.setElevationDegrees(0)).toBe(0);
    expect(model.pivots.elevation.rotation.x).toBe(0);
  });

  it('moves every part along its authored explode vector and restores it exactly', () => {
    const model = createSteampunkBallistaModel();
    const controller = new BallistaController(model);
    const original = new Map([...model.parts].map(([id, part]) => [id, part.position.clone()]));

    controller.setExplode(1);
    for (const [id, part] of model.parts) {
      const start = original.get(id);
      const vector = model.explodeVectors.get(id);
      expect(start).toBeTruthy();
      expect(vector).toBeTruthy();
      expect(part.position.x).toBeCloseTo((start?.x ?? 0) + (vector?.[0] ?? 0));
      expect(part.position.y).toBeCloseTo((start?.y ?? 0) + (vector?.[1] ?? 0));
      expect(part.position.z).toBeCloseTo((start?.z ?? 0) + (vector?.[2] ?? 0));
    }

    controller.setExplode(0);
    for (const [id, part] of model.parts) {
      expect(part.position.distanceTo(original.get(id)!)).toBeLessThan(0.000_001);
    }
  });

  it('fires into a stable unloaded state without moving the cocking drive', () => {
    const model = createSteampunkBallistaModel();
    const controller = new BallistaController(model);
    const projectileStartZ = model.pivots.launchedBolt.position.z;
    const crankStart = model.pivots.crank.rotation.x;
    const winchStart = model.pivots.winch.rotation.x;
    const gearStart = model.pivots.rearGear.rotation.x;
    const drawStart = model.pivots.drawPoint.position.z;
    const recoilStart = model.pivots.recoilCarriage.position.z;

    expect(controller.state).toBe('loaded');
    expect(controller.fire()).toBe(true);
    expect(controller.fire()).toBe(false);
    expect(controller.crankAndLoad()).toBe(false);
    controller.update(0.18);
    expect(model.pivots.launchedBolt.visible).toBe(true);
    expect(model.pivots.launchedBolt.position.z).toBeLessThan(projectileStartZ - 1);
    expect(model.pivots.drawPoint.position.z).toBeLessThan(drawStart);
    expect(model.pivots.recoilCarriage.position.z).toBeGreaterThan(recoilStart);
    expect(model.pivots.crank.rotation.x).toBe(crankStart);
    expect(model.pivots.winch.rotation.x).toBe(winchStart);
    expect(model.pivots.rearGear.rotation.x).toBe(gearStart);

    controller.update(1);
    expect(controller.state).toBe('unloaded');
    expect(model.pivots.loadedBolt.visible).toBe(false);
    expect(model.pivots.launchedBolt.visible).toBe(false);
    expect(controller.fire()).toBe(false);
  });

  it('uses the crank, winch, gear, string, and bolt only during loading', () => {
    const model = createSteampunkBallistaModel();
    const controller = new BallistaController(model);
    const loadedBoltZ = model.pivots.loadedBolt.position.z;
    const loadedDrawZ = model.pivots.drawPoint.position.z;
    const crankStart = model.pivots.crank.rotation.x;
    const winchStart = model.pivots.winch.rotation.x;
    const gearStart = model.pivots.rearGear.rotation.x;

    controller.fire();
    controller.update(1);
    const unloadedDrawZ = model.pivots.drawPoint.position.z;
    expect(unloadedDrawZ).toBeLessThan(loadedDrawZ - 2);
    expect(controller.crankAndLoad()).toBe(true);
    expect(controller.crankAndLoad()).toBe(false);
    controller.update(0.75);
    expect(model.pivots.crank.rotation.x).not.toBe(crankStart);
    expect(model.pivots.winch.rotation.x).not.toBe(winchStart);
    expect(model.pivots.rearGear.rotation.x).not.toBe(gearStart);
    expect(model.pivots.drawPoint.position.z).toBeGreaterThan(unloadedDrawZ);

    controller.update(2);
    expect(controller.state).toBe('loaded');
    expect(model.pivots.loadedBolt.visible).toBe(true);
    expect(model.pivots.loadedBolt.position.z).toBeCloseTo(loadedBoltZ);
    expect(model.pivots.drawPoint.position.z).toBeCloseTo(loadedDrawZ);
    expect(model.pivots.crank.rotation.x).toBe(crankStart);
    expect(model.pivots.winch.rotation.x).toBe(winchStart);
    expect(model.pivots.rearGear.rotation.x).toBe(gearStart);
  });

  it('rejects explode changes while an action timeline is active', () => {
    const model = createSteampunkBallistaModel();
    const controller = new BallistaController(model);

    expect(controller.setExplode(0.2)).toBeCloseTo(0.2);
    controller.fire();
    expect(controller.setExplode(0.8)).toBeCloseTo(0.2);
    controller.update(1);
    expect(controller.setExplode(0.8)).toBeCloseTo(0.8);
    controller.crankAndLoad();
    expect(controller.setExplode(0.1)).toBeCloseTo(0.8);
  });
});
