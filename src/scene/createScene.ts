import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Box3Helper,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MathUtils,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import type { BallistaModel, PartId } from '../model/types';

export interface BallistaSceneOptions {
  readonly mount: HTMLElement;
  readonly model: BallistaModel;
  readonly onSelect: (partId: PartId | null) => void;
  readonly reviewMode?: boolean;
}

export interface BallistaScene {
  readonly renderer: WebGLRenderer;
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  resetCamera(): void;
  update(): void;
  render(): void;
  dispose(): void;
}

const REFERENCE_CAMERA = new Vector3(-13, 10, -16.8);
const REFERENCE_TARGET = new Vector3(0, 3.45, -0.15);

export function referenceCameraForAspect(aspect: number): Vector3 {
  const narrowScale = aspect < 0.8 ? 0.99 / Math.max(aspect, 0.35) : 1;
  return REFERENCE_TARGET.clone().add(
    REFERENCE_CAMERA.clone().sub(REFERENCE_TARGET).multiplyScalar(narrowScale),
  );
}

function partIdFromObject(object: { parent: unknown; userData: Record<string, unknown> }): PartId | null {
  let current: typeof object | null = object;
  while (current) {
    if (typeof current.userData.partId === 'string') return current.userData.partId as PartId;
    current = current.parent as typeof object | null;
  }
  return null;
}

export function createScene(options: BallistaSceneOptions): BallistaScene {
  const { mount, model, onSelect, reviewMode = false } = options;
  const scene = new Scene();
  scene.fog = new Fog(0x9fb9d2, 45, 100);

  const camera = new PerspectiveCamera(34, 1, 0.1, 120);
  camera.position.copy(REFERENCE_CAMERA);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (reviewMode) renderer.setClearColor(0xc9d9ec, 1);
  renderer.domElement.setAttribute('aria-label', 'Three-dimensional steampunk ballista turret');
  renderer.domElement.setAttribute('role', 'img');
  mount.append(renderer.domElement);

  const pmremGenerator = new PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.58;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(REFERENCE_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 13;
  controls.maxDistance = 90;
  controls.maxPolarAngle = MathUtils.degToRad(84);
  controls.minPolarAngle = MathUtils.degToRad(18);
  controls.update();

  const hemisphere = new HemisphereLight(0xddeeff, 0x2b3038, 1.7);
  hemisphere.name = 'cool-hemisphere-fill';
  scene.add(hemisphere);
  const ambient = new AmbientLight(0xbdd1df, 0.82);
  ambient.name = 'ambient-workshop-fill';
  scene.add(ambient);

  const key = new DirectionalLight(0xe8f2ff, 2.65);
  key.name = 'upper-left-key';
  key.position.set(-9, 17, -11);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -13;
  key.shadow.camera.right = 13;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.00035;
  scene.add(key);

  const rim = new DirectionalLight(0xffb45e, 1.25);
  rim.name = 'warm-brass-rim';
  rim.position.set(10, 9, 12);
  scene.add(rim);

  const groundMaterial = new ShadowMaterial({
    color: 0x26394c,
    transparent: true,
    opacity: reviewMode ? 0.12 : 0.22,
  });
  groundMaterial.name = 'shadow-ground-material';
  const ground = new Mesh(new PlaneGeometry(90, 90), groundMaterial);
  ground.name = 'shadow-ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground, model.root);

  const selectionBox = new Box3Helper(new Box3(), new Color(0xffbd55));
  selectionBox.name = 'selected-part-outline';
  selectionBox.visible = false;
  scene.add(selectionBox);
  let selectedPart: PartId | null = null;
  let selectedGroup = selectedPart ? model.parts.get(selectedPart) : undefined;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let pointerDown = new Vector2();

  let initialFrameApplied = false;
  const resize = (): void => {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!initialFrameApplied) {
      camera.position.copy(referenceCameraForAspect(camera.aspect));
      controls.target.copy(REFERENCE_TARGET);
      controls.update();
      initialFrameApplied = true;
    }
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  resize();

  const resetCamera = (): void => {
    camera.position.copy(referenceCameraForAspect(camera.aspect));
    controls.target.copy(REFERENCE_TARGET);
    controls.update();
    selectedPart = null;
    selectedGroup = undefined;
    selectionBox.visible = false;
    onSelect(null);
  };
  const onPointerDown = (event: PointerEvent): void => {
    pointerDown.set(event.clientX, event.clientY);
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (pointerDown.distanceTo(new Vector2(event.clientX, event.clientY)) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(model.root, true)[0];
    selectedPart = hit ? partIdFromObject(hit.object) : null;
    selectedGroup = selectedPart ? model.parts.get(selectedPart) : undefined;
    selectionBox.visible = Boolean(selectedGroup);
    if (selectedGroup) selectionBox.box.setFromObject(selectedGroup);
    onSelect(selectedPart);
  };
  const onContextLost = (event: Event): void => event.preventDefault();
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('dblclick', resetCamera);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);

  return {
    renderer,
    camera,
    controls,
    resetCamera,
    update() {
      controls.update();
      if (selectedGroup) selectionBox.box.setFromObject(selectedGroup);
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('dblclick', resetCamera);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      selectionBox.geometry.dispose();
      const selectionMaterials = Array.isArray(selectionBox.material)
        ? selectionBox.material
        : [selectionBox.material];
      selectionMaterials.forEach((material) => material.dispose());
      ground.geometry.dispose();
      groundMaterial.dispose();
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
