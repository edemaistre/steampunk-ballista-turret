import { Mesh, Timer, type MeshStandardMaterial } from 'three';

import { downloadBallistaGlb } from './export/exportBallistaGlb';
import { BallistaController } from './interaction/BallistaController';
import { createSteampunkBallistaModel } from './model/createSteampunkBallistaModel';
import { calculateModelStatistics } from './model/statistics';
import type { PartId } from './model/types';
import { createScene } from './scene/createScene';
import './styles.css';
import { createControlPanel, type ControlPanel } from './ui/createControlPanel';

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing application element: ${selector}`);
  return element;
}

const sceneMount = requiredElement<HTMLDivElement>('#scene-mount');
const controlMount = requiredElement<HTMLElement>('#control-mount');
const referenceMount = requiredElement<HTMLElement>('#reference-mount');
const referenceModalMount = requiredElement<HTMLElement>('#reference-modal-mount');
const partsStat = requiredElement<HTMLElement>('[data-stat="parts"]');
const facesStat = requiredElement<HTMLElement>('[data-stat="faces"]');
const loadingStatus = requiredElement<HTMLElement>('#loading-status');
const errorMessage = requiredElement<HTMLElement>('#webgl-error');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reviewMode = new URLSearchParams(window.location.search).get('review');
if (reviewMode) document.documentElement.dataset.review = reviewMode;

let controlPanel: ControlPanel | undefined;
let frame = 0;

try {
  const model = createSteampunkBallistaModel({ reducedMotion });
  const statistics = calculateModelStatistics(model.root);
  const numberFormatter = new Intl.NumberFormat('en-US');
  partsStat.textContent = numberFormatter.format(statistics.parts);
  facesStat.textContent = numberFormatter.format(statistics.faces);
  if (reviewMode === 'blockout') {
    model.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const reviewMaterial = material as MeshStandardMaterial;
        reviewMaterial.map = null;
        reviewMaterial.roughnessMap = null;
        reviewMaterial.normalMap = null;
        reviewMaterial.aoMap = null;
        reviewMaterial.flatShading = true;
        if (reviewMaterial.name === 'pale-faceted-wood') {
          reviewMaterial.color.setHex(0xc8b28f);
        }
        reviewMaterial.needsUpdate = true;
      });
    });
  }
  const controller = new BallistaController(model, reducedMotion);
  const scene = createScene({
    mount: sceneMount,
    model,
    reviewMode: reviewMode === 'blockout',
    onSelect(partId: PartId | null) {
      controlPanel?.setSelectedPart(partId?.replaceAll('-', ' ') ?? null);
    },
  });
  controlPanel = createControlPanel({
    mount: controlMount,
    referenceMount,
    referenceModalMount,
    controller,
    onResetCamera: scene.resetCamera,
    onDownloadModel: () => downloadBallistaGlb(model.root),
  });

  loadingStatus.textContent = 'Model ready';
  loadingStatus.dataset.state = 'ready';
  const timer = new Timer();
  timer.connect(document);

  const animate = (timestamp: number): void => {
    frame = requestAnimationFrame(animate);
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.2);
    if (!document.hidden) {
      controller.update(delta);
      scene.update();
      controlPanel?.update();
      scene.render();
    }
  };

  frame = requestAnimationFrame(animate);

  const dispose = (): void => {
    cancelAnimationFrame(frame);
    timer.dispose();
    controlPanel?.dispose();
    scene.dispose();
    model.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true });
  Object.assign(window, {
    __BALLISTA__: { model, controller, scene, dispose },
  });
} catch (error) {
  loadingStatus.hidden = true;
  errorMessage.hidden = false;
  console.error('Unable to initialize the ballista renderer.', error);
}
