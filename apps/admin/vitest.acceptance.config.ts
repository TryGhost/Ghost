import { availableParallelism } from 'node:os';

import { defineConfig } from 'vitest/config';
import type { BrowserCommand, BrowserCommandContext } from 'vitest/node';
import { playwright } from '@vitest/browser-playwright';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { sharedDefine, sharedResolve } from './vite.shared';

/**
 * Browser mode: real Chromium via Vitest Browser Mode against a fake Ghost
 * Admin API (test-utils/acceptance/). `*.acceptance.test.tsx` boots the whole
 * app; `*.component.test.tsx` mounts one component in the app's provider
 * stack. Unit tests stay in vite.config.ts (jsdom).
 */

/*
 * Each worker drives its own Chromium page, so workers stay ~97% busy right up
 * to the core count and then fall off a cliff (63% at 18 workers on an 18-core
 * box, and worse wall-clock than 8). Leave a core for the Vite server and cap
 * the top end; the floor keeps 2-core runners on their current two workers.
 */
const getWorkerCount = () => Math.min(8, Math.max(2, availableParallelism() - 1));

// MSW cannot see iframe navigations; these route them per page (test-utils/acceptance/frames.ts).
type BrowserPage = BrowserCommandContext['page'];
type FrameRouteHandler = Parameters<BrowserPage['route']>[1];
const frameFakes = new WeakMap<
  BrowserPage,
  Array<{ matcher: (url: URL) => boolean; handler: FrameRouteHandler }>
>();
const guardedPages = new WeakSet<BrowserPage>();

const isExternal = (url: URL) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1';

const guardFrameNavigations: BrowserCommand<[]> = async ({ page }) => {
  if (guardedPages.has(page)) {
    return;
  }
  guardedPages.add(page);
  // Registered first, so later fakes take precedence.
  await page.route(isExternal, (route) =>
    route.request().resourceType() === 'document'
      ? route.fulfill({ status: 418, contentType: 'text/plain', body: 'Unfaked frame' })
      : route.fallback(),
  );
};

const fakeFrameOrigin: BrowserCommand<[origin: string, html: string]> = async (
  { page },
  origin,
  html,
) => {
  const fakedOrigin = new URL(origin).origin;
  const matcher = (url: URL) => url.origin === fakedOrigin;
  const handler: FrameRouteHandler = (route) =>
    route.fulfill({ contentType: 'text/html', body: html });
  await page.route(matcher, handler);
  frameFakes.set(page, [...(frameFakes.get(page) ?? []), { matcher, handler }]);
};

const resetFakeFrameOrigins: BrowserCommand<[]> = async ({ page }) => {
  const fakes = frameFakes.get(page) ?? [];
  frameFakes.delete(page);
  await Promise.all(fakes.map(({ matcher, handler }) => page.unroute(matcher, handler)));
};

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
  },
  resolve: sharedResolve,
  test: {
    name: 'acceptance',
    include: ['src/**/*.acceptance.test.tsx', 'src/**/*.component.test.tsx'],
    maxWorkers: getWorkerCount(),
    setupFiles: ['./test-utils/acceptance/setup.ts'],
    // Most journeys finish well under a second, but a few that wait out a
    // product-side hold reach ~6s; this leaves those headroom on slower CI.
    testTimeout: 15_000,
    expect: {
      // Full-app renders are slower than unit renders; the harness's
      // toHaveCount matcher derives its polling from this too.
      poll: { timeout: 5000 },
    },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      commands: { fakeFrameOrigin, guardFrameNavigations, resetFakeFrameOrigins },
      instances: [{ browser: 'chromium' }],
      // Failure screenshots land in __screenshots__/ (gitignored).
      screenshotFailures: true,
      // Match the e2e suite's desktop viewport — the admin chrome
      // collapses into mobile menus at the vitest default (414px).
      viewport: { width: 1280, height: 800 },
    },
  },
});
