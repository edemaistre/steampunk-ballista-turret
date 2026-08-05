import { describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry,
  DataTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  RGBAFormat,
  UnsignedByteType,
  type Object3D,
} from 'three';

import {
  BALLISTA_GLB_FILENAME,
  createBallistaGlb,
  type BinaryGltfExporter,
} from '../src/export/exportBallistaGlb';

describe('createBallistaGlb', () => {
  it('exports a metadata-safe clone as a non-empty binary GLB', async () => {
    const root = new Group();
    root.name = 'steampunk-ballista-turret';
    const roughnessMap = new DataTexture(
      new Uint8Array([128, 128, 128, 255]),
      1,
      1,
      RGBAFormat,
      UnsignedByteType,
    );
    const material = new MeshStandardMaterial({ roughness: 0.5, roughnessMap });
    const mesh = new Mesh(new BoxGeometry(1, 2, 3), material);
    mesh.name = 'test-component';
    root.add(mesh);
    root.userData.sculptRuntime = { root };

    const parseAsync = vi.fn(async (input: Object3D, options?: { binary?: boolean }) => {
      expect(input).not.toBe(root);
      expect(input.name).toBe(root.name);
      const exportMesh = input.getObjectByName('test-component') as Mesh;
      expect(exportMesh).toBeTruthy();
      expect((exportMesh.material as MeshStandardMaterial).roughnessMap).toBeNull();
      expect(exportMesh.material).not.toBe(material);
      expect(input.userData).toEqual({});
      expect(options?.binary).toBe(true);
      return new Uint8Array([0x67, 0x6c, 0x54, 0x46]).buffer;
    });
    const exporter: BinaryGltfExporter = { parseAsync };

    const blob = await createBallistaGlb(root, exporter);

    expect(BALLISTA_GLB_FILENAME).toBe('steampunk-ballista-turret.glb');
    expect(blob.type).toBe('model/gltf-binary');
    expect(blob.size).toBe(4);
    expect(root.userData.sculptRuntime).toEqual({ root });
    expect(material.roughnessMap).toBe(roughnessMap);
  });

  it('rejects a non-binary exporter response', async () => {
    const exporter: BinaryGltfExporter = {
      parseAsync: vi.fn(async () => ({ asset: { version: '2.0' } })),
    };

    await expect(createBallistaGlb(new Group(), exporter)).rejects.toThrow('binary GLB');
  });
});
