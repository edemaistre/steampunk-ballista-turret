import { MathUtils, Vector3 } from 'three';

import type { BallistaModel, PartId } from '../model/types';

export type BallistaActionState = 'loaded' | 'firing' | 'unloaded' | 'cocking';

interface OriginalPartTransform {
  readonly position: Vector3;
}

function smoothstep(value: number): number {
  const clamped = MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export class BallistaController {
  readonly #model: BallistaModel;
  readonly #originalParts = new Map<PartId, OriginalPartTransform>();
  readonly #loadedBoltStartZ: number;
  readonly #launchedBoltStart: Vector3;
  readonly #drawLoadedZ: number;
  readonly #drawUnloadedZ = -0.35;
  readonly #crankStartX: number;
  readonly #winchStartX: number;
  readonly #rearGearStartX: number;
  readonly #leftLimbStartY: number;
  readonly #rightLimbStartY: number;
  readonly #recoilStart: Vector3;
  readonly #latchStartX: number;
  readonly #fireDuration: number;
  readonly #cockingDuration: number;
  #state: BallistaActionState = 'loaded';
  #elapsed = 0;
  #explodeProgress = 0;

  constructor(model: BallistaModel, reducedMotion = false) {
    this.#model = model;
    this.#loadedBoltStartZ = model.pivots.loadedBolt.position.z;
    this.#launchedBoltStart = model.pivots.launchedBolt.position.clone();
    this.#drawLoadedZ = model.pivots.drawPoint.position.z;
    this.#crankStartX = model.pivots.crank.rotation.x;
    this.#winchStartX = model.pivots.winch.rotation.x;
    this.#rearGearStartX = model.pivots.rearGear.rotation.x;
    this.#leftLimbStartY = model.pivots.leftLimbFlex.rotation.y;
    this.#rightLimbStartY = model.pivots.rightLimbFlex.rotation.y;
    this.#recoilStart = model.pivots.recoilCarriage.position.clone();
    this.#latchStartX = model.pivots.releaseLatch.rotation.x;
    this.#fireDuration = reducedMotion ? 0.12 : 0.65;
    this.#cockingDuration = reducedMotion ? 0.3 : 2;
    for (const [id, part] of model.parts) {
      this.#originalParts.set(id, { position: part.position.clone() });
    }
    model.pivots.refreshStrings();
  }

  get state(): BallistaActionState {
    return this.#state;
  }

  setYawDegrees(degrees: number): number {
    const clamped = MathUtils.clamp(degrees, -180, 180);
    this.#model.pivots.yaw.rotation.y = MathUtils.degToRad(clamped);
    return clamped;
  }

  setElevationDegrees(degrees: number): number {
    const clamped = MathUtils.clamp(degrees, -20, 20);
    this.#model.pivots.elevation.rotation.x = MathUtils.degToRad(clamped);
    return clamped;
  }

  setExplode(progress: number): number {
    if (this.#state === 'firing' || this.#state === 'cocking') {
      return this.#explodeProgress;
    }
    const clamped = MathUtils.clamp(progress, 0, 1);
    for (const [id, part] of this.#model.parts) {
      const original = this.#originalParts.get(id);
      const explodeVector = this.#model.explodeVectors.get(id);
      if (!original || !explodeVector) continue;
      part.position.set(
        original.position.x + explodeVector[0] * clamped,
        original.position.y + explodeVector[1] * clamped,
        original.position.z + explodeVector[2] * clamped,
      );
    }
    this.#explodeProgress = clamped;
    this.#model.pivots.refreshStrings();
    return clamped;
  }

  fire(): boolean {
    if (this.#state !== 'loaded') return false;
    this.#elapsed = 0;
    this.#state = 'firing';
    this.#model.pivots.launchedBolt.position.copy(this.#model.pivots.loadedBolt.position);
    this.#model.pivots.launchedBolt.visible = true;
    this.#model.pivots.loadedBolt.visible = false;
    this.#model.pivots.boltTrail.visible = true;
    this.#setTrailOpacity(0);
    return true;
  }

  crankAndLoad(): boolean {
    if (this.#state !== 'unloaded') return false;
    this.#elapsed = 0;
    this.#state = 'cocking';
    this.#model.pivots.loadedBolt.visible = false;
    this.#model.pivots.loadedBolt.position.z = this.#loadedBoltTargetZ() + 3.2;
    return true;
  }

  update(deltaSeconds: number): void {
    if (this.#state === 'loaded' || this.#state === 'unloaded') return;
    this.#elapsed += Math.max(0, deltaSeconds);
    if (this.#state === 'firing') {
      this.#updateFiring(MathUtils.clamp(this.#elapsed / this.#fireDuration, 0, 1));
      return;
    }
    this.#updateCocking(MathUtils.clamp(this.#elapsed / this.#cockingDuration, 0, 1));
  }

  #loadedBoltTargetZ(): number {
    const explodeVector = this.#model.explodeVectors.get('bolt');
    return this.#loadedBoltStartZ + (explodeVector?.[2] ?? 0) * this.#explodeProgress;
  }

  #setLimbRelease(progress: number): void {
    const releaseAngle = 0.095 * progress;
    this.#model.pivots.leftLimbFlex.rotation.y = this.#leftLimbStartY - releaseAngle;
    this.#model.pivots.rightLimbFlex.rotation.y = this.#rightLimbStartY + releaseAngle;
  }

  #setTrailOpacity(opacity: number): void {
    const materials = Array.isArray(this.#model.pivots.boltTrail.material)
      ? this.#model.pivots.boltTrail.material
      : [this.#model.pivots.boltTrail.material];
    materials.forEach((material) => {
      material.opacity = opacity;
    });
  }

  #updateFiring(progress: number): void {
    const release = 1 - (1 - Math.min(progress / 0.34, 1)) ** 4;
    const launch = 1 - (1 - progress) ** 3;
    const recoilPhase = Math.min(progress / 0.72, 1);
    const recoil = Math.sin(recoilPhase * Math.PI) * 0.3;
    this.#model.pivots.drawPoint.position.z = MathUtils.lerp(this.#drawLoadedZ, this.#drawUnloadedZ, release);
    this.#setLimbRelease(release);
    this.#model.pivots.releaseLatch.rotation.x = this.#latchStartX - Math.sin(Math.min(progress / 0.28, 1) * Math.PI) * 0.34;
    this.#model.pivots.launchedBolt.position.z = this.#launchedBoltStart.z - launch * 15;
    this.#model.pivots.boltTrail.position.z = this.#model.pivots.launchedBolt.position.z + 2.25;
    this.#setTrailOpacity(Math.sin(progress * Math.PI) * 0.48);
    this.#model.pivots.recoilCarriage.position.z = this.#recoilStart.z + recoil;
    this.#model.pivots.refreshStrings();

    if (progress < 1) return;
    this.#model.pivots.drawPoint.position.z = this.#drawUnloadedZ;
    this.#setLimbRelease(1);
    this.#model.pivots.releaseLatch.rotation.x = this.#latchStartX;
    this.#model.pivots.recoilCarriage.position.copy(this.#recoilStart);
    this.#model.pivots.launchedBolt.visible = false;
    this.#model.pivots.launchedBolt.position.copy(this.#launchedBoltStart);
    this.#model.pivots.boltTrail.visible = false;
    this.#setTrailOpacity(0);
    this.#model.pivots.refreshStrings();
    this.#state = 'unloaded';
    this.#elapsed = 0;
  }

  #updateCocking(progress: number): void {
    const draw = smoothstep(progress);
    const ratchetPulse = Math.sin(progress * Math.PI * 24) * 0.035;
    const turns = progress * 3.25 + ratchetPulse;
    this.#model.pivots.crank.rotation.x = this.#crankStartX + turns * Math.PI * 2;
    this.#model.pivots.winch.rotation.x = this.#winchStartX + turns * Math.PI * 0.82;
    this.#model.pivots.rearGear.rotation.x = this.#rearGearStartX - turns * Math.PI * 1.6;
    this.#model.pivots.drawPoint.position.z = MathUtils.lerp(this.#drawUnloadedZ, this.#drawLoadedZ, draw);
    this.#setLimbRelease(1 - draw);
    this.#model.pivots.releaseLatch.rotation.x = this.#latchStartX - Math.sin(progress * Math.PI) * 0.08;

    const feed = smoothstep((progress - 0.58) / 0.36);
    if (progress >= 0.58) this.#model.pivots.loadedBolt.visible = true;
    this.#model.pivots.loadedBolt.position.z = MathUtils.lerp(
      this.#loadedBoltTargetZ() + 3.2,
      this.#loadedBoltTargetZ(),
      feed,
    );
    this.#model.pivots.refreshStrings();

    if (progress < 1) return;
    this.#model.pivots.crank.rotation.x = this.#crankStartX;
    this.#model.pivots.winch.rotation.x = this.#winchStartX;
    this.#model.pivots.rearGear.rotation.x = this.#rearGearStartX;
    this.#model.pivots.drawPoint.position.z = this.#drawLoadedZ;
    this.#model.pivots.leftLimbFlex.rotation.y = this.#leftLimbStartY;
    this.#model.pivots.rightLimbFlex.rotation.y = this.#rightLimbStartY;
    this.#model.pivots.releaseLatch.rotation.x = this.#latchStartX;
    this.#model.pivots.loadedBolt.position.z = this.#loadedBoltTargetZ();
    this.#model.pivots.loadedBolt.visible = true;
    this.#model.pivots.refreshStrings();
    this.#state = 'loaded';
    this.#elapsed = 0;
  }
}
