import { availableParallelism } from 'node:os';

import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { sharedDefine, sharedResolve } from './vite.shared';

/**
 * Acceptance tier: full-app tests in real Chromium via Vitest Browser Mode,
 * against a fake Ghost Admin API (test-utils/acceptance/). Unit tests stay
 * in vite.config.ts (jsdom).
 */

/*
 * Each worker drives its own Chromium page, so workers stay ~97% busy right up
 * to the core count and then fall off a cliff (63% at 18 workers on an 18-core
 * box, and worse wall-clock than 8). Leave a core for the Vite server and cap
 * the top end; the floor keeps 2-core runners on their current two workers.
 */
const getWorkerCount = () => Math.min(8, Math.max(2, availableParallelism() - 1));

export default defineConfig({
  plugins: [tailwindcss() as PluginOption, react()],
  // Serves the MSW service worker script; scoped to the test config so it
  // never ends up in the production build's public assets.
  publicDir: './test-utils/acceptance/public',
  define: sharedDefine,
  optimizeDeps: {
    // Scan every app module so deps behind lazy routes are pre-bundled up
    // front — mid-run discovery reloads the test page and flakes the
    // suite. Test files and screen helpers import test-lane modules the
    // browser bundler can't process; vitest serves those itself.
    entries: ['src/**/*.{ts,tsx}', '!src/**/*.test.*', '!src/**/*.screen.ts'],
    // limit-service is CommonJS, and Vite only converts CommonJS while pre-bundling. A
    // workspace package is treated as source and served raw, where `module` does not exist,
    // so the import fails and the limiter silently falls back to reporting every host limit
    // as absent. Force it through the pre-bundler until the package itself is converted.
    include: ['@tryghost/limit-service'],
  },
  resolve: sharedResolve,
  test: {
    name: 'acceptance',
    include: ['src/**/*.acceptance.test.tsx'],
    maxWorkers: getWorkerCount(),
    setupFiles: ['./test-utils/acceptance/setup.ts'],
    expect: {
      // Full-app renders are slower than unit renders; the harness's
      // toHaveCount matcher derives its polling from this too.
      poll: { timeout: 5000 },
    },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      // Failure screenshots land in __screenshots__/ (gitignored).
      screenshotFailures: true,
      // Match the e2e suite's desktop viewport — the admin chrome
      // collapses into mobile menus at the vitest default (414px).
      viewport: { width: 1280, height: 800 },
    },
  },
});
