import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';

import { createBallistaMaterials } from '../src/model/materials';
import { BALLISTA_SPEC } from '../src/model/spec';

describe('ballista materials', () => {
  it('keeps metal, paint, wood, and lens responses distinct', () => {
    const materials = createBallistaMaterials(BALLISTA_SPEC);
    expect(materials.iron.metalness).toBeCloseTo(0.72);
    expect(materials.iron.roughness).toBeCloseTo(0.32);
    expect(materials.teal.metalness).toBeCloseTo(0.45);
    expect(materials.wood.metalness).toBe(0);
    expect(materials.lens.emissiveIntensity).toBeGreaterThan(3);
  });

  it('uses independent correctly tagged color and data textures', () => {
    const materials = createBallistaMaterials(BALLISTA_SPEC);
    expect(materials.wood.map).toBeInstanceOf(DataTexture);
    expect(materials.wood.map?.colorSpace).toBe(SRGBColorSpace);
    expect(materials.wood.roughnessMap).toBeInstanceOf(DataTexture);
    expect(materials.wood.roughnessMap?.colorSpace).toBe(NoColorSpace);
    expect(materials.wood.map).not.toBe(materials.wood.roughnessMap);
  });

  it('generates the same wood texture for the reconstruction seed', () => {
    const first = createBallistaMaterials(BALLISTA_SPEC).wood.map as DataTexture;
    const second = createBallistaMaterials(BALLISTA_SPEC).wood.map as DataTexture;
    expect(first.image.data).not.toBeNull();
    expect(second.image.data).not.toBeNull();
    expect(Array.from(first.image.data!.slice(0, 128))).toEqual(
      Array.from(second.image.data!.slice(0, 128)),
    );
  });

  it('stores authored albedo channels in sRGB without multiplying teal twice', () => {
    const materials = createBallistaMaterials(BALLISTA_SPEC);
    const tealMap = materials.teal.map as DataTexture;
    const woodMap = materials.wood.map as DataTexture;

    expect(materials.teal.color.getHex()).toBe(0xffffff);
    expect(tealMap.image.data?.[1]).toBeGreaterThan(70);
    expect(woodMap.image.data?.[0]).toBeGreaterThan(170);
    expect(tealMap.magFilter).toBe(LinearFilter);
    expect(tealMap.minFilter).toBe(LinearMipmapLinearFilter);
    expect(tealMap.generateMipmaps).toBe(true);
  });

  it('keeps painted-metal roughness variation subtle enough for real-time viewing', () => {
    const roughness = createBallistaMaterials(BALLISTA_SPEC).teal.roughnessMap as DataTexture;
    const sample = Array.from(roughness.image.data!.slice(0, 8_192)).filter((_, index) => index % 4 === 0);
    const range = Math.max(...sample) - Math.min(...sample);

    expect(range).toBeLessThanOrEqual(12);
  });
});
