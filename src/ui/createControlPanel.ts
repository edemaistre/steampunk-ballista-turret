import type { BallistaActionState } from '../interaction/BallistaController';

export interface ControlPanelController {
  readonly state: BallistaActionState;
  setYawDegrees(degrees: number): number;
  setElevationDegrees(degrees: number): number;
  setExplode(progress: number): number;
  fire(): boolean;
  crankAndLoad(): boolean;
}

export interface ControlPanelOptions {
  readonly mount: HTMLElement;
  readonly referenceMount: HTMLElement;
  readonly referenceModalMount: HTMLElement;
  readonly controller: ControlPanelController;
  readonly onResetCamera: () => void;
  readonly onDownloadModel: () => Promise<void>;
}

export interface ControlPanel {
  setSelectedPart(label: string | null): void;
  update(): void;
  dispose(): void;
}

function readRequired<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing control panel element: ${selector}`);
  return element;
}

export function createControlPanel(options: ControlPanelOptions): ControlPanel {
  const {
    mount,
    referenceMount,
    referenceModalMount,
    controller,
    onResetCamera,
    onDownloadModel,
  } = options;
  const referenceImageUrl = new URL('../../reference/ballista-reference.png', import.meta.url).href;
  document.documentElement.dataset.theme = 'dark';
  mount.innerHTML = `
    <section class="fire-control" aria-label="Fire control">
      <header class="control-header">
        <div>
          <p class="control-kicker">Mechanical controls</p>
          <h2>Fire control</h2>
        </div>
        <span class="action-state" data-readout="state">loaded</span>
      </header>

      <dl class="inspection-readout">
        <div>
          <dt>Selected</dt>
          <dd data-readout="part">Whole assembly</dd>
        </div>
        <div>
          <dt>Bearing</dt>
          <dd data-readout="yaw">0°</dd>
        </div>
      </dl>

      <label class="control-row" for="yaw-control">
        <span>Yaw</span>
        <output for="yaw-control" data-output="yaw">0°</output>
        <input id="yaw-control" type="range" min="-180" max="180" value="0" step="1">
      </label>
      <label class="control-row" for="elevation-control">
        <span>Pitch</span>
        <output for="elevation-control" data-output="elevation">0°</output>
        <input id="elevation-control" type="range" min="-20" max="20" value="0" step="1">
      </label>
      <label class="control-row" for="explode-control">
        <span>Exploded view</span>
        <output for="explode-control" data-output="explode">0%</output>
        <input id="explode-control" type="range" min="0" max="100" value="0" step="1">
      </label>

      <div class="control-actions">
        <button class="fire-button" type="button" data-action="fire">
          <span class="fire-button-dot" aria-hidden="true"></span>
          <span data-label="fire">Fire bolt</span>
        </button>
        <button class="load-button" type="button" data-action="load" disabled>
          <span class="load-button-ratchet" aria-hidden="true"></span>
          <span data-label="load">Crank &amp; Load</span>
        </button>
        <div class="utility-actions">
          <button class="utility-button" type="button" data-action="reset" aria-label="Reset">
            <span class="button-icon" aria-hidden="true">↺</span><span data-label>Reset</span>
          </button>
          <button class="utility-button" type="button" data-action="theme" aria-label="Switch color mode">
            <span class="button-icon" aria-hidden="true">✦</span><span data-label>Light</span>
          </button>
          <button class="utility-button" type="button" data-action="reference" aria-label="Show original image" aria-controls="reference-mount" aria-expanded="false">
            <span class="button-icon" aria-hidden="true">▧</span><span data-label>Image</span>
          </button>
          <button class="utility-button" type="button" data-action="download" aria-label="Download GLB">
            <span class="button-icon" aria-hidden="true">↓</span><span data-label>GLB</span>
          </button>
        </div>
      </div>
    </section>

    <div class="bearing-scale" aria-hidden="true">
      <span>-180</span><i></i><span>-120</span><i></i><span>-60</span><i></i><b>0</b><i></i><span>+60</span><i></i><span>+120</span><i></i><span>+180</span>
      <div class="bearing-needle"></div>
    </div>
  `;
  referenceMount.innerHTML = `
    <figure class="reference-card" aria-label="Original Scenario Asset">
      <div class="reference-card-header">
        <span>Source reference</span>
        <button type="button" data-action="close-reference" aria-label="Close original image">Close</button>
      </div>
      <button class="reference-preview" type="button" data-action="enlarge-reference" aria-label="Open original image fullscreen">
        <img src="${referenceImageUrl}" alt="Original Scenario Asset">
      </button>
      <figcaption>Original Scenario Asset</figcaption>
    </figure>
  `;
  referenceMount.hidden = true;
  referenceModalMount.innerHTML = `
    <div class="reference-lightbox" role="dialog" aria-modal="true" aria-label="Original Scenario Asset fullscreen">
      <button class="lightbox-close" type="button" data-action="close-reference-modal" aria-label="Close fullscreen image">Close</button>
      <img src="${referenceImageUrl}" alt="Original Scenario Asset fullscreen">
      <p>Original Scenario Asset</p>
    </div>
  `;
  referenceModalMount.hidden = true;

  const yaw = readRequired<HTMLInputElement>(mount, '#yaw-control');
  const elevation = readRequired<HTMLInputElement>(mount, '#elevation-control');
  const explode = readRequired<HTMLInputElement>(mount, '#explode-control');
  const yawOutput = readRequired<HTMLOutputElement>(mount, '[data-output="yaw"]');
  const elevationOutput = readRequired<HTMLOutputElement>(mount, '[data-output="elevation"]');
  const explodeOutput = readRequired<HTMLOutputElement>(mount, '[data-output="explode"]');
  const yawReadout = readRequired<HTMLElement>(mount, '[data-readout="yaw"]');
  const partReadout = readRequired<HTMLElement>(mount, '[data-readout="part"]');
  const stateReadout = readRequired<HTMLElement>(mount, '[data-readout="state"]');
  const fireButton = readRequired<HTMLButtonElement>(mount, '[data-action="fire"]');
  const loadButton = readRequired<HTMLButtonElement>(mount, '[data-action="load"]');
  const fireLabel = readRequired<HTMLElement>(fireButton, '[data-label="fire"]');
  const loadLabel = readRequired<HTMLElement>(loadButton, '[data-label="load"]');
  const resetButton = readRequired<HTMLButtonElement>(mount, '[data-action="reset"]');
  const themeButton = readRequired<HTMLButtonElement>(mount, '[data-action="theme"]');
  const themeLabel = readRequired<HTMLElement>(themeButton, '[data-label]');
  const referenceButton = readRequired<HTMLButtonElement>(mount, '[data-action="reference"]');
  const downloadButton = readRequired<HTMLButtonElement>(mount, '[data-action="download"]');
  const closeReferenceButton = readRequired<HTMLButtonElement>(referenceMount, '[data-action="close-reference"]');
  const enlargeReferenceButton = readRequired<HTMLButtonElement>(referenceMount, '[data-action="enlarge-reference"]');
  const closeReferenceModalButton = readRequired<HTMLButtonElement>(referenceModalMount, '[data-action="close-reference-modal"]');
  const bearingScale = readRequired<HTMLElement>(mount, '.bearing-scale');

  const onYaw = (): void => {
    const value = controller.setYawDegrees(Number(yaw.value));
    const label = `${Math.round(value)}°`;
    yawOutput.value = label;
    yawReadout.textContent = label;
    bearingScale.style.setProperty('--bearing-position', `${50 + (value / 180) * 46}%`);
  };
  const onElevation = (): void => {
    const value = controller.setElevationDegrees(Number(elevation.value));
    elevationOutput.value = `${Math.round(value)}°`;
  };
  const onExplode = (): void => {
    const value = controller.setExplode(Number(explode.value) / 100);
    explodeOutput.value = `${Math.round(value * 100)}%`;
  };
  const onFire = (): void => {
    controller.fire();
    update();
  };
  const onLoad = (): void => {
    controller.crankAndLoad();
    update();
  };
  const onReset = (): void => {
    yaw.value = '0';
    elevation.value = '0';
    explode.value = '0';
    onYaw();
    onElevation();
    onExplode();
    onResetCamera();
  };
  const onTheme = (): void => {
    const light = document.documentElement.dataset.theme !== 'light';
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    themeLabel.textContent = light ? 'Dark' : 'Light';
  };
  const setReferenceVisibility = (visible: boolean): void => {
    referenceMount.hidden = !visible;
    referenceButton.setAttribute('aria-expanded', String(visible));
    referenceButton.setAttribute('aria-label', visible ? 'Hide original image' : 'Show original image');
  };
  const onReference = (): void => setReferenceVisibility(referenceMount.hidden !== false);
  const onCloseReference = (): void => {
    setReferenceVisibility(false);
    referenceButton.focus();
  };
  const setReferenceModalVisibility = (visible: boolean): void => {
    referenceModalMount.hidden = !visible;
    document.documentElement.classList.toggle('reference-modal-open', visible);
    if (visible) closeReferenceModalButton.focus();
  };
  const onEnlargeReference = (): void => setReferenceModalVisibility(true);
  const onCloseReferenceModal = (): void => {
    setReferenceModalVisibility(false);
    enlargeReferenceButton.focus();
  };
  const onReferenceModalBackdrop = (event: MouseEvent): void => {
    if (event.target === referenceModalMount) onCloseReferenceModal();
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && referenceModalMount.hidden === false) onCloseReferenceModal();
  };
  const onDownload = async (): Promise<void> => {
    downloadButton.disabled = true;
    downloadButton.setAttribute('aria-busy', 'true');
    try {
      await onDownloadModel();
    } catch (error) {
      console.error('Unable to export the ballista GLB.', error);
    } finally {
      downloadButton.disabled = false;
      downloadButton.removeAttribute('aria-busy');
    }
  };
  const update = (): void => {
    const state = controller.state;
    stateReadout.textContent = state;
    stateReadout.dataset.state = state;
    const active = state === 'firing' || state === 'cocking';
    fireButton.disabled = state !== 'loaded';
    loadButton.disabled = state !== 'unloaded';
    explode.disabled = active;
    fireLabel.textContent = state === 'firing' ? 'Bolt away' : 'Fire bolt';
    loadLabel.textContent = state === 'cocking' ? 'Winding mechanism' : 'Crank & Load';
  };

  yaw.addEventListener('input', onYaw);
  elevation.addEventListener('input', onElevation);
  explode.addEventListener('input', onExplode);
  fireButton.addEventListener('click', onFire);
  loadButton.addEventListener('click', onLoad);
  resetButton.addEventListener('click', onReset);
  themeButton.addEventListener('click', onTheme);
  referenceButton.addEventListener('click', onReference);
  closeReferenceButton.addEventListener('click', onCloseReference);
  enlargeReferenceButton.addEventListener('click', onEnlargeReference);
  closeReferenceModalButton.addEventListener('click', onCloseReferenceModal);
  referenceModalMount.addEventListener('click', onReferenceModalBackdrop);
  document.addEventListener('keydown', onKeydown);
  downloadButton.addEventListener('click', onDownload);
  onElevation();
  update();

  return {
    setSelectedPart(label) {
      partReadout.textContent = label ?? 'Whole assembly';
    },
    update,
    dispose() {
      yaw.removeEventListener('input', onYaw);
      elevation.removeEventListener('input', onElevation);
      explode.removeEventListener('input', onExplode);
      fireButton.removeEventListener('click', onFire);
      loadButton.removeEventListener('click', onLoad);
      resetButton.removeEventListener('click', onReset);
      themeButton.removeEventListener('click', onTheme);
      referenceButton.removeEventListener('click', onReference);
      closeReferenceButton.removeEventListener('click', onCloseReference);
      enlargeReferenceButton.removeEventListener('click', onEnlargeReference);
      closeReferenceModalButton.removeEventListener('click', onCloseReferenceModal);
      referenceModalMount.removeEventListener('click', onReferenceModalBackdrop);
      document.removeEventListener('keydown', onKeydown);
      downloadButton.removeEventListener('click', onDownload);
      mount.replaceChildren();
      referenceMount.replaceChildren();
      referenceMount.hidden = true;
      referenceModalMount.replaceChildren();
      referenceModalMount.hidden = true;
      document.documentElement.classList.remove('reference-modal-open');
    },
  };
}
