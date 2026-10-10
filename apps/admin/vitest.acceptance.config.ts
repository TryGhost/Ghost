import { availableParallelism } from 'node:os';

import { defineConfig } from 'vitest/config';
import type { BrowserCommand, BrowserCommandContext } from 'vitest/node';
import { playwright } from '@vitest/browser-playwright';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
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
// Through CDP rather than page.route: Playwright turns the HTTP cache off while
// any route is set, and every spec file's fresh iframe would then fetch and
// compile each app module again.
type BrowserPage = BrowserCommandContext['page'];
const frameFakes = new WeakMap<BrowserPage, Map<string, string>>();

const isExternal = (url: URL) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1';

const guardFrameNavigations: BrowserCommand<[]> = async ({ page }) => {
  if (frameFakes.has(page)) {
    return;
  }
  const fakes = new Map<string, string>();
  frameFakes.set(page, fakes);
  const session = await page.context().newCDPSession(page);
  const fulfill = (requestId: string, responseCode: number, contentType: string, body: string) =>
    session.send('Fetch.fulfillRequest', {
      requestId,
      responseCode,
      responseHeaders: [{ name: 'Content-Type', value: contentType }],
      body: Buffer.from(body).toString('base64'),
    });
  session.on('Fetch.requestPaused', ({ requestId, request }) => {
    const url = new URL(request.url);
    const fake = fakes.get(url.origin);
    // The tester page is local, so an external document is always a frame.
    const reply = !isExternal(url)
      ? session.send('Fetch.continueRequest', { requestId })
      : fake !== undefined
        ? fulfill(requestId, 200, 'text/html', fake)
        : fulfill(requestId, 418, 'text/plain', 'Unfaked frame');
    reply.catch(() => {
      // The frame went away before its navigation was answered.
    });
  });
  await session.send('Fetch.enable', { patterns: [{ resourceType: 'Document' }] });
};

const fakeFrameOrigin: BrowserCommand<[origin: string, html: string]> = (
  { page },
  origin,
  html,
) => {
  frameFakes.get(page)?.set(new URL(origin).origin, html);
};

const resetFakeFrameOrigins: BrowserCommand<[]> = ({ page }) => {
  frameFakes.get(page)?.clear();
};

// Module requests fail as a dropped connection would (test-utils/acceptance/module-loads.ts).
// Routed on the context: the page's routes never see what MSW's service worker fetches.
// Any route turns the HTTP cache off, so these stay limited to the specs that need them.
type BrowserContext = BrowserCommandContext['context'];
const failedModules = new WeakMap<BrowserContext, Array<(url: URL) => boolean>>();

const failModuleLoads: BrowserCommand<[pathEnd: string]> = async ({ context }, pathEnd) => {
  const matcher = (url: URL) => url.pathname.endsWith(pathEnd);
  await context.route(matcher, (route) => route.abort('connectionreset'));
  failedModules.set(context, [...(failedModules.get(context) ?? []), matcher]);
};

const resetFailedModuleLoads: BrowserCommand<[]> = async ({ context }) => {
  const matchers = failedModules.get(context) ?? [];
  failedModules.delete(context);
  await Promise.all(matchers.map((matcher) => context.unroute(matcher)));
};

export default defineConfig({
  plugins: [tailwindcss() as PluginOption, svgr(), react()],
  server: {
    // Vitest owns console reporting; Vite forwarding bypasses silent below.
    forwardConsole: false,
  },
  // Serves the MSW service worker scripts; scoped to the test config so it
  // never ends up in the production build's public assets.
  publicDir: './test-utils/acceptance/public',
  define: sharedDefine,
  // Run on React's production build, the one Admin ships: the development
  // build and StrictMode's double renders cost the suite more than a tenth of
  // its time. App and workspace sources keep their NODE_ENV; only pre-bundled
  // dependencies switch, so JSX must not target the dev runtime either.
  oxc: { jsx: { development: false } },
  optimizeDeps: {
    // Scan every app module so deps behind lazy routes are pre-bundled up
    // front — mid-run discovery reloads the test page and flakes the
    // suite. Test files and screen helpers import test-lane modules the
    // browser bundler can't process; vitest serves those itself.
    entries: ['src/**/*.{ts,tsx}', '!src/**/*.test.*', '!src/**/*.screen.ts'],
    // The harness's MSW (and its graphql dependency) would otherwise load as
    // ~150 separate modules in every spec file's fresh iframe.
    include: ['msw', 'msw/browser'],
    rolldownOptions: {
      transform: { define: { 'process.env.NODE_ENV': JSON.stringify('production') } },
    },
  },
  resolve: sharedResolve,
  test: {
    name: 'acceptance',
    // Print totals and failures, without per-test output that CI expands into
    // separate lines. Use --silent=false --reporter=verbose to debug.
    silent: 'passed-only',
    reporters: process.env.GITHUB_ACTIONS
      ? ['minimal', 'github-actions', 'json']
      : ['minimal', 'json'],
    // Keep per-test timings and failure details without expanding the CI log.
    outputFile: { json: './test-results/acceptance.json' },
    include: ['src/**/*.acceptance.test.tsx', 'src/**/*.component.test.tsx'],
    maxWorkers: getWorkerCount(),
    setupFiles: ['./test-utils/acceptance/react-production.ts', './test-utils/acceptance/setup.ts'],
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
      commands: {
        failModuleLoads,
        fakeFrameOrigin,
        guardFrameNavigations,
        resetFailedModuleLoads,
        resetFakeFrameOrigins,
      },
      instances: [{ browser: 'chromium' }],
      // Failure screenshots land in __screenshots__/ (gitignored).
      screenshotFailures: true,
      // Match the e2e suite's desktop viewport — the admin chrome
      // collapses into mobile menus at the vitest default (414px).
      viewport: { width: 1280, height: 800 },
    },
  },
});
