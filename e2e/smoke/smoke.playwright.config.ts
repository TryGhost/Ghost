import { defineConfig } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Standalone config for the smoke lane.
 *
 * Smoke tests run against the long-lived `pnpm dev` / `pnpm dev:stripe` stack
 * rather than a per-test Ghost instance, and are never a CI gate — so this
 * config is deliberately NOT one of the e2e suite's projects and never
 * participates in `pnpm test:e2e`.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const E2E_ROOT = dirname(HERE);
const BASE_URL = process.env.GHOST_BASE_URL || 'http://localhost:2368';

// Both live under paths the repo already ignores.
export const AUTH_STATE = join(E2E_ROOT, 'playwright', 'smoke', 'owner.json');
const OUTPUT_DIR = join(E2E_ROOT, 'test-results', 'smoke');

export default defineConfig({
  testDir: HERE,
  testMatch: ['*.smoke.spec.ts'],
  globalSetup: join(HERE, 'global-setup.ts'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  timeout: 240 * 1000,
  globalTimeout: 60 * 60 * 1000,
  expect: { timeout: 20 * 1000 },
  reporter: [['list', { printSteps: false }]],
  outputDir: OUTPUT_DIR,
  use: {
    baseURL: BASE_URL,
    storageState: AUTH_STATE,
    extraHTTPHeaders: { Origin: BASE_URL },
    colorScheme: 'light',
    viewport: { width: 1920, height: 1080 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 30 * 1000,
    navigationTimeout: 60 * 1000,
  },
});
