import { expect, test } from '@playwright/test';

const runtimeProcess = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};
const screenshotRoot = runtimeProcess.process?.env?.BALLISTA_SCREENSHOT_ROOT
  ?? '/Users/emmanuel/Developer/scratch/playwright-screenshots';

test('inspects and operates the ballista in dark and light modes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Steampunk Ballista' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('Model ready')).toBeVisible();
  await expect(page.locator('[data-readout="state"]')).toHaveText('loaded');
  await expect(page.locator('#yaw-control')).toHaveValue('0');
  await expect(page.locator('#elevation-control')).toHaveValue('0');
  await expect(page.locator('[data-stat="parts"]')).not.toHaveText('0');
  await expect(page.locator('[data-stat="faces"]')).not.toHaveText('0');
  expect(await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { model: { pivots: { elevation: { rotation: { x: number } } } } } }).__BALLISTA__;
    return runtime?.model.pivots.elevation.rotation.x;
  })).toBe(0);

  await page.locator('canvas').click({ position: { x: 700, y: 520 } });
  await expect(page.locator('[data-readout="part"]')).not.toHaveText('Whole assembly');

  await page.locator('#yaw-control').fill('35');
  await page.locator('#elevation-control').fill('20');
  await page.locator('#explode-control').fill('32');
  await expect(page.locator('[data-readout="yaw"]')).toContainText('35°');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('[data-readout="part"]')).toHaveText('Whole assembly');
  await expect(page.locator('[data-readout="yaw"]')).toContainText('0°');
  await expect(page.locator('#yaw-control')).toHaveValue('0');
  await expect(page.locator('#elevation-control')).toHaveValue('0');
  await expect(page.locator('#explode-control')).toHaveValue('0');
  expect(await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { model: { pivots: { yaw: { rotation: { y: number } }; elevation: { rotation: { x: number } } } } } }).__BALLISTA__;
    return {
      yaw: runtime?.model.pivots.yaw.rotation.y,
      pitch: runtime?.model.pivots.elevation.rotation.x,
    };
  })).toEqual({ yaw: 0, pitch: 0 });

  const referenceButton = page.locator('[data-action="reference"]');
  await expect(referenceButton.locator('[data-label]')).toHaveText('Image');
  await expect(referenceButton).toHaveAttribute('aria-label', 'Show original image');
  await referenceButton.click();
  await expect(page.locator('#reference-mount')).toBeVisible();
  const referenceImage = page.getByRole('img', { name: 'Original Scenario Asset' });
  await expect(referenceImage).toBeVisible();
  const referenceAsset = await referenceImage.evaluate(async (image: HTMLImageElement) => {
    const response = await fetch(image.currentSrc);
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());

    return {
      dimensions: { width: image.naturalWidth, height: image.naturalHeight },
      sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    };
  });
  expect(referenceAsset).toEqual({
    dimensions: { width: 1254, height: 1254 },
    sha256: '9681482ed5ee3f17ad31a5439bb5fe89064b96eb79806d3d3c90a2edf66b322d',
  });
  await expect(page.locator('#reference-mount').getByText('Original Scenario Asset', { exact: true })).toBeVisible();
  await expect(referenceButton).toHaveAttribute('aria-label', 'Hide original image');
  const identityWidth = await page.locator('.identity-frame').evaluate((element) => element.getBoundingClientRect().width);
  const referenceWidth = await page.locator('#reference-mount').evaluate((element) => element.getBoundingClientRect().width);
  expect(Math.abs(identityWidth - referenceWidth)).toBeLessThan(1);
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-original-reference.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Open original image fullscreen' }).click();
  await expect(page.locator('#reference-modal-mount')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Original Scenario Asset fullscreen' })).toBeVisible();
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-original-fullscreen.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Close fullscreen image' }).click();
  await expect(page.locator('#reference-modal-mount')).toBeHidden();
  await page.getByRole('button', { name: 'Close original image' }).click();
  await expect(page.locator('#reference-mount')).toBeHidden();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download GLB' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('steampunk-ballista-turret.glb');
  expect(await download.failure()).toBeNull();
  await download.saveAs(`${screenshotRoot}/steampunk-ballista-turret.glb`);

  const fireButton = page.locator('[data-action="fire"]');
  const loadButton = page.locator('[data-action="load"]');
  await fireButton.click();
  await expect(page.locator('[data-readout="state"]')).toHaveText('firing');
  await page.waitForTimeout(120);
  await expect(page.locator('[data-readout="state"]')).toHaveText('unloaded');
  await expect(fireButton).toBeDisabled();
  await expect(loadButton).toBeEnabled();
  expect(await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { model: { pivots: { loadedBolt: { visible: boolean } } } } }).__BALLISTA__;
    return runtime?.model.pivots.loadedBolt.visible;
  })).toBe(false);
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-unloaded.png`,
    fullPage: true,
  });

  await loadButton.click();
  await expect(page.locator('[data-readout="state"]')).toHaveText('cocking');
  await page.waitForTimeout(720);
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-reloaded.png`,
    fullPage: true,
  });
  await expect(page.locator('[data-readout="state"]')).toHaveText('loaded', { timeout: 4_000 });
  await expect(fireButton).toBeEnabled();
  expect(await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { model: { pivots: { loadedBolt: { visible: boolean } } } } }).__BALLISTA__;
    return runtime?.model.pivots.loadedBolt.visible;
  })).toBe(true);
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-dark.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Switch color mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-light.png`,
    fullPage: true,
  });
});

test('keeps the controls usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Steampunk Ballista' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fire bolt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crank & Load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show original image' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download GLB' })).toBeVisible();
  await expect(page.locator('#yaw-control')).toBeVisible();
  const cameraDistance = await page.evaluate(() => {
    const runtime = (window as unknown as {
      __BALLISTA__: { scene: { camera: { position: { length(): number } } } };
    }).__BALLISTA__;
    return runtime.scene.camera.position.length();
  });
  expect(cameraDistance).toBeGreaterThan(45);
  await page.screenshot({
    path: `${screenshotRoot}/steampunk-ballista-v2-mobile-dark.png`,
    fullPage: true,
  });
});

test('captures the v2 hero geometry from meaningful review views', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.goto('/?review=visual', { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('canvas');
  await expect(page.getByText('Model ready')).toHaveText('Model ready');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.identity-plate')).toBeHidden();
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-reference.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(-24, 12.5, -22);
    runtime?.scene.controls.target.set(0, 4.05, 0);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-rear-orbit.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(-17, 3.2, 19);
    runtime?.scene.controls.target.set(0, 3.15, 0);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-underside.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(9.2, 5.0, -4.2);
    runtime?.scene.controls.target.set(6.4, 3.3, -0.6);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-tip-alignment.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(-7.4, 7.2, -5.2);
    runtime?.scene.controls.target.set(-2.4, 5.35, -0.85);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-no-scope.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(0, 3.0, -6.6);
    runtime?.scene.controls.target.set(0, 1.4, -1.9);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-chain-clearance.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(-7.2, 4.7, -0.4);
    runtime?.scene.controls.target.set(-1.65, 3.0, -0.2);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-fasteners-left.png` });

  await page.evaluate(() => {
    const runtime = (window as typeof window & { __BALLISTA__?: { scene: { camera: { position: { set(x: number, y: number, z: number): void } }; controls: { target: { set(x: number, y: number, z: number): void }; update(): void } } } }).__BALLISTA__;
    runtime?.scene.camera.position.set(7.2, 4.7, -0.4);
    runtime?.scene.controls.target.set(1.65, 3.0, -0.2);
    runtime?.scene.controls.update();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${screenshotRoot}/steampunk-ballista-v2-fasteners-right.png` });
});
