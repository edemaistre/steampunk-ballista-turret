import type { Group, Mesh, Object3D } from 'three';

export const PART_IDS = [
  'base',
  'turntable',
  'turret',
  'bow-left',
  'bow-right',
  'rail',
  'bolt',
  'winch',
  'crank',
  'scope',
  'gauge',
  'chains',
  'spare-bolts',
] as const;

export type PartId = (typeof PART_IDS)[number];

export const SCULPT_COMPONENT_IDS = [
  'root',
  'base-assembly',
  'turntable-assembly',
  'turret-assembly',
  'weapon-assembly',
  'accessory-assembly',
  'base-foundation',
  'deck-panels',
  'corner-braces',
  'yaw-track',
  'turntable',
  'turret-shell',
  'inner-cradle',
  'bow-assembly',
  'bow-left',
  'bow-right',
  'projectile-rail',
  'loaded-bolt',
  'support-frame',
  'winch-drum',
  'rear-gear',
  'crank',
  'tension-cable',
  'scope',
  'gauge',
  'hanging-chains',
  'spare-bolts',
  'mounting-feet',
] as const;

export type SculptComponentId = (typeof SCULPT_COMPONENT_IDS)[number];

export interface BallistaSpec {
  readonly seed: number;
  readonly dimensions: {
    readonly base: readonly [number, number, number];
    readonly bowSpan: number;
    readonly length: number;
    readonly height: number;
  };
  readonly identityDetails: readonly string[];
  readonly colors: Record<'teal' | 'iron' | 'brass' | 'wood' | 'rust' | 'lens', number>;
}

export interface BallistaPivots {
  readonly yaw: Group;
  readonly elevation: Group;
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
    readonly left: Object3D;
    readonly center: Object3D;
    readonly right: Object3D;
  };
  readonly refreshStrings: () => void;
}

export interface BallistaColliderProxy {
  readonly type: 'box' | 'cylinder';
  readonly componentId: SculptComponentId;
  readonly size: readonly [number, number, number];
  readonly offset: readonly [number, number, number];
  readonly isTrigger: false;
}

export interface BallistaRuntime {
  readonly version: 1;
  readonly selectablePartIds: readonly PartId[];
  readonly nodes: Readonly<Record<SculptComponentId, Object3D>>;
  readonly meshes: Readonly<Record<SculptComponentId, readonly Mesh[]>>;
  readonly sockets: Readonly<Record<string, Object3D>>;
  readonly colliders: Readonly<Record<SculptComponentId, BallistaColliderProxy>>;
  readonly destructionGroups: Readonly<Record<SculptComponentId, readonly Object3D[]>>;
}

export interface BallistaModel {
  readonly root: Group;
  readonly runtime: BallistaRuntime;
  readonly pivots: BallistaPivots;
  readonly parts: ReadonlyMap<PartId, Group>;
  readonly explodeVectors: ReadonlyMap<PartId, readonly [number, number, number]>;
  readonly dispose: () => void;
}

export interface BallistaBuildOptions {
  readonly reducedMotion?: boolean;
}
