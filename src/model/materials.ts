import {
  DataTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';

import { seededRandom } from './geometry';
import type { BallistaSpec } from './types';

export interface BallistaMaterials {
  readonly teal: MeshPhysicalMaterial;
  readonly iron: MeshStandardMaterial;
  readonly brass: MeshPhysicalMaterial;
  readonly wood: MeshStandardMaterial;
  readonly rust: MeshStandardMaterial;
  readonly cable: MeshStandardMaterial;
  readonly gauge: MeshStandardMaterial;
  readonly lens: MeshPhysicalMaterial;
}

type PixelWriter = (x: number, y: number, random: () => number) => readonly [number, number, number];

function makeTexture(
  size: number,
  seed: number,
  colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
  writer: PixelWriter,
): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const random = seededRandom(seed);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const [red, green, blue] = writer(x, y, random);
      data[index] = Math.max(0, Math.min(255, Math.round(red)));
      data[index + 1] = Math.max(0, Math.min(255, Math.round(green)));
      data[index + 2] = Math.max(0, Math.min(255, Math.round(blue)));
      data[index + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function colorChannels(color: number): readonly [number, number, number] {
  return [
    (color >> 16) & 0xff,
    (color >> 8) & 0xff,
    color & 0xff,
  ];
}

export function createBallistaMaterials(spec: BallistaSpec): BallistaMaterials {
  const textureSize = 1024;
  const [woodRed, woodGreen, woodBlue] = colorChannels(spec.colors.wood);
  const woodMap = makeTexture(
    textureSize,
    spec.seed + 11,
    SRGBColorSpace,
    (x, y, random) => {
      const longitudinal = Math.sin(x * 0.064 + Math.sin(y * 0.012) * 1.8);
      const broadBand = Math.sin(x * 0.014 + y * 0.003) * 0.5;
      const variation = longitudinal * 13 + broadBand * 10 + (random() - 0.5) * 5;
      return [woodRed + variation, woodGreen + variation * 0.86, woodBlue + variation * 0.62];
    },
  );
  woodMap.repeat.set(3.8, 1);

  const woodRoughness = makeTexture(
    textureSize,
    spec.seed + 17,
    NoColorSpace,
    (x, y, random) => {
      const grain = Math.sin(x * 0.071 + y * 0.005) * 17;
      const value = 158 + grain + (random() - 0.5) * 14;
      return [value, value, value];
    },
  );
  woodRoughness.repeat.set(3.8, 1);

  const [tealRed, tealGreen, tealBlue] = colorChannels(spec.colors.teal);
  const tealMap = makeTexture(
    textureSize,
    spec.seed + 23,
    SRGBColorSpace,
    (x, y, random) => {
      const mottle = Math.sin(x * 0.018) * Math.cos(y * 0.021) * 3 + (random() - 0.5) * 0.35;
      return [tealRed + mottle * 0.55, tealGreen + mottle, tealBlue + mottle];
    },
  );
  tealMap.repeat.set(1.5, 1.5);

  const tealRoughness = makeTexture(
    textureSize,
    spec.seed + 29,
    NoColorSpace,
    (x, y, random) => {
      const broad = Math.sin(x * 0.025 + y * 0.017) * 3;
      const value = 102 + broad + (random() - 0.5) * 4;
      return [value, value, value];
    },
  );

  const ironRoughness = makeTexture(
    textureSize,
    spec.seed + 31,
    NoColorSpace,
    (x, y, random) => {
      const directional = Math.sin(x * 0.09 + y * 0.006) * 3;
      const value = 84 + directional + (random() - 0.5) * 5;
      return [value, value, value];
    },
  );

  const teal = new MeshPhysicalMaterial({
    color: 0xffffff,
    map: tealMap,
    roughnessMap: tealRoughness,
    metalness: 0.45,
    roughness: 0.38,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
  });
  teal.name = 'teal-painted-metal';

  const iron = new MeshStandardMaterial({
    color: spec.colors.iron,
    metalness: 0.72,
    roughness: 0.32,
    roughnessMap: ironRoughness,
  });
  iron.name = 'dark-iron';

  const brass = new MeshPhysicalMaterial({
    color: spec.colors.brass,
    metalness: 0.78,
    roughness: 0.28,
    clearcoat: 0.08,
    clearcoatRoughness: 0.35,
  });
  brass.name = 'aged-brass';

  const wood = new MeshStandardMaterial({
    color: 0xffffff,
    map: woodMap,
    roughnessMap: woodRoughness,
    metalness: 0,
    roughness: 0.62,
  });
  wood.name = 'pale-faceted-wood';

  const rust = new MeshStandardMaterial({
    color: spec.colors.rust,
    metalness: 0.18,
    roughness: 0.58,
  });
  rust.name = 'orange-wear';

  const cable = new MeshStandardMaterial({
    color: 0x554f48,
    metalness: 0.12,
    roughness: 0.68,
  });
  cable.name = 'rope-and-cable';

  const gauge = new MeshStandardMaterial({
    color: 0xd7d2be,
    metalness: 0,
    roughness: 0.7,
  });
  gauge.name = 'gauge-face';

  const lens = new MeshPhysicalMaterial({
    color: spec.colors.lens,
    emissive: spec.colors.lens,
    emissiveIntensity: 4.2,
    metalness: 0,
    roughness: 0.14,
    transmission: 0.38,
    thickness: 0.12,
    ior: 1.45,
  });
  lens.name = 'amber-emissive-lens';

  return { teal, iron, brass, wood, rust, cable, gauge, lens };
}
