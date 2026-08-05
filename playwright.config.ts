import { defineConfig } from '@playwright/test';

const runtimeProcess = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};
const screenshotRoot = runtimeProcess.process?.env?.BALLISTA_SCREENSHOT_ROOT
  ?? '/Users/emmanuel/Developer/scratch/playwright-screenshots';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: `${screenshotRoot}/ballista-test-results`,
  use: {
    baseURL: 'http://127.0.0.1:4189',
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4189',
    url: 'http://127.0.0.1:4189',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
