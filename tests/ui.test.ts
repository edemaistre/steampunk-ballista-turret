import { describe, expect, it, vi } from 'vitest';

import type { BallistaActionState } from '../src/interaction/BallistaController';
import { createControlPanel } from '../src/ui/createControlPanel';

function inputRange(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('createControlPanel', () => {
  it('renders accessible controls and synchronizes all mechanical inputs', () => {
    const mount = document.createElement('div');
    const referenceMount = document.createElement('div');
    const referenceModalMount = document.createElement('div');
    let state: BallistaActionState = 'loaded';
    const controller = {
      setYawDegrees: vi.fn((value: number) => value),
      setElevationDegrees: vi.fn((value: number) => value),
      setExplode: vi.fn((value: number) => value),
      fire: vi.fn(() => true),
      crankAndLoad: vi.fn(() => true),
      get state(): BallistaActionState {
        return state;
      },
    };
    const onResetCamera = vi.fn();
    const onDownloadModel = vi.fn(async () => undefined);
    const panel = createControlPanel({
      mount,
      referenceMount,
      referenceModalMount,
      controller,
      onResetCamera,
      onDownloadModel,
    });

    expect(mount.querySelector('[aria-label="Fire control"]')).toBeTruthy();
    const fireButton = mount.querySelector<HTMLButtonElement>('[data-action="fire"]')!;
    const loadButton = mount.querySelector<HTMLButtonElement>('[data-action="load"]')!;
    const yaw = mount.querySelector<HTMLInputElement>('#yaw-control')!;
    const elevation = mount.querySelector<HTMLInputElement>('#elevation-control')!;
    const explode = mount.querySelector<HTMLInputElement>('#explode-control')!;
    expect(yaw.min).toBe('-180');
    expect(yaw.max).toBe('180');
    expect(yaw.value).toBe('0');
    expect(elevation.closest('label')?.textContent).toContain('Pitch');
    expect(elevation.min).toBe('-20');
    expect(elevation.max).toBe('20');
    expect(elevation.value).toBe('0');
    expect(mount.querySelector('.bearing-scale')?.textContent).toContain('-180');
    expect(mount.querySelector('.bearing-scale')?.textContent).toContain('+180');
    expect(mount.querySelector('[data-action="reset"] [data-label]')?.textContent).toBe('Reset');
    inputRange(yaw, '42');
    inputRange(elevation, '18');
    inputRange(explode, '65');
    expect(mount.querySelector('[data-readout="yaw"]')?.textContent).toContain('42°');
    expect(fireButton.disabled).toBe(false);
    expect(loadButton.disabled).toBe(true);
    fireButton.click();
    state = 'unloaded';
    panel.update();
    expect(fireButton.disabled).toBe(true);
    expect(loadButton.disabled).toBe(false);
    loadButton.click();
    mount.querySelector<HTMLButtonElement>('[data-action="reset"]')!.click();

    expect(controller.setYawDegrees).toHaveBeenCalledWith(42);
    expect(controller.setElevationDegrees).toHaveBeenCalledWith(18);
    expect(controller.setExplode).toHaveBeenCalledWith(0.65);
    expect(controller.fire).toHaveBeenCalledOnce();
    expect(controller.crankAndLoad).toHaveBeenCalledOnce();
    expect(onResetCamera).toHaveBeenCalledOnce();
    expect(controller.setYawDegrees).toHaveBeenLastCalledWith(0);
    expect(controller.setElevationDegrees).toHaveBeenLastCalledWith(0);
    expect(controller.setExplode).toHaveBeenLastCalledWith(0);
    expect(mount.querySelector('[data-readout="yaw"]')?.textContent).toContain('0°');
    expect(mount.querySelector<HTMLOutputElement>('[data-output="elevation"]')?.value).toBe('0°');
    expect(mount.querySelector<HTMLOutputElement>('[data-output="explode"]')?.value).toBe('0%');
    expect(document.documentElement.dataset.theme).toBe('dark');

    const referenceButton = mount.querySelector<HTMLButtonElement>('[data-action="reference"]')!;
    expect(referenceButton.querySelector('[data-label]')?.textContent).toBe('Image');
    expect(referenceButton.getAttribute('aria-label')).toBe('Show original image');
    expect(referenceButton.getAttribute('aria-expanded')).toBe('false');
    expect(referenceMount.hidden).toBe(true);
    referenceButton.click();
    expect(referenceButton.querySelector('[data-label]')?.textContent).toBe('Image');
    expect(referenceButton.getAttribute('aria-label')).toBe('Hide original image');
    expect(referenceButton.getAttribute('aria-expanded')).toBe('true');
    expect(referenceMount.hidden).toBe(false);
    expect(referenceMount.querySelector<HTMLImageElement>('img')?.alt).toBe('Original Scenario Asset');
    expect(referenceMount.textContent).toContain('Original Scenario Asset');
    referenceMount.querySelector<HTMLButtonElement>('[data-action="enlarge-reference"]')!.click();
    expect(referenceModalMount.hidden).toBe(false);
    expect(referenceModalMount.querySelector('[role="dialog"]')).toBeTruthy();
    expect(referenceModalMount.querySelector<HTMLImageElement>('img')?.alt).toBe('Original Scenario Asset fullscreen');
    referenceModalMount.querySelector<HTMLButtonElement>('[data-action="close-reference-modal"]')!.click();
    expect(referenceModalMount.hidden).toBe(true);
    referenceMount.querySelector<HTMLButtonElement>('[data-action="close-reference"]')!.click();
    expect(referenceMount.hidden).toBe(true);

    mount.querySelector<HTMLButtonElement>('[data-action="download"]')!.click();
    expect(onDownloadModel).toHaveBeenCalledOnce();

    panel.dispose();
    expect(mount.childElementCount).toBe(0);
    expect(referenceMount.childElementCount).toBe(0);
    expect(referenceModalMount.childElementCount).toBe(0);
  });

  it('updates the selected part and action state readouts', () => {
    const mount = document.createElement('div');
    const referenceMount = document.createElement('div');
    const referenceModalMount = document.createElement('div');
    let state: BallistaActionState = 'cocking';
    const controller = {
      setYawDegrees: vi.fn((value: number) => value),
      setElevationDegrees: vi.fn((value: number) => value),
      setExplode: vi.fn((value: number) => value),
      fire: vi.fn(() => false),
      crankAndLoad: vi.fn(() => false),
      get state(): BallistaActionState {
        return state;
      },
    };
    const panel = createControlPanel({
      mount,
      referenceMount,
      referenceModalMount,
      controller,
      onResetCamera: vi.fn(),
      onDownloadModel: vi.fn(async () => undefined),
    });
    panel.setSelectedPart('rear gear');
    panel.update();

    expect(mount.querySelector('[data-readout="part"]')?.textContent).toContain('rear gear');
    expect(mount.querySelector('[data-readout="state"]')?.textContent).toContain('cocking');
    expect(mount.querySelector<HTMLButtonElement>('[data-action="fire"]')?.disabled).toBe(true);
    expect(mount.querySelector<HTMLButtonElement>('[data-action="load"]')?.disabled).toBe(true);
    expect(mount.querySelector<HTMLInputElement>('#explode-control')?.disabled).toBe(true);

    state = 'unloaded';
    panel.update();
    expect(mount.querySelector<HTMLInputElement>('#explode-control')?.disabled).toBe(false);
    expect(mount.querySelector<HTMLButtonElement>('[data-action="load"]')?.disabled).toBe(false);
  });
});
