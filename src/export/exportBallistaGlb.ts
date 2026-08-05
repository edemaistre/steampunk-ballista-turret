import { Mesh, type Material, type Object3D, type Texture } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export const BALLISTA_GLB_FILENAME = 'steampunk-ballista-turret.glb';

export interface BinaryGltfExporter {
  parseAsync(
    input: Object3D,
    options: { binary: true; onlyVisible: true },
  ): Promise<ArrayBuffer | Record<string, unknown>>;
}

function cloneWithoutRuntimeMetadata(source: Object3D): Object3D {
  const sourceUserData = source.userData;
  source.userData = {};
  let clone: Object3D;
  try {
    clone = source.clone(false);
  } finally {
    source.userData = sourceUserData;
  }
  clone.userData = {};
  source.children.forEach((child) => clone.add(cloneWithoutRuntimeMetadata(child)));
  return clone;
}

type MetalRoughMaterial = Material & {
  roughnessMap?: Texture | null;
  metalnessMap?: Texture | null;
};

function isDataTexture(texture: Texture | null | undefined): boolean {
  return Boolean(texture && 'isDataTexture' in texture && texture.isDataTexture);
}

function makeMaterialsExportSafe(root: Object3D): void {
  const clones = new Map<Material, Material>();
  const cloneMaterial = (source: Material): Material => {
    const existing = clones.get(source);
    if (existing) return existing;
    const clone = source.clone() as MetalRoughMaterial;
    if (isDataTexture(clone.roughnessMap)) clone.roughnessMap = null;
    if (isDataTexture(clone.metalnessMap)) clone.metalnessMap = null;
    clones.set(source, clone);
    return clone;
  };
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });
}

export async function createBallistaGlb(
  root: Object3D,
  exporter: BinaryGltfExporter = new GLTFExporter(),
): Promise<Blob> {
  root.updateWorldMatrix(true, true);
  const exportRoot = cloneWithoutRuntimeMetadata(root);
  makeMaterialsExportSafe(exportRoot);
  const result = await exporter.parseAsync(exportRoot, {
    binary: true,
    onlyVisible: true,
  });
  if (!(result instanceof ArrayBuffer)) {
    throw new Error('GLTFExporter did not return a binary GLB payload.');
  }
  return new Blob([result], { type: 'model/gltf-binary' });
}

export async function downloadBallistaGlb(root: Object3D): Promise<void> {
  const blob = await createBallistaGlb(root);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = BALLISTA_GLB_FILENAME;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
