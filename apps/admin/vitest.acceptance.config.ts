import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

import { build, type Rolldown } from 'vite';
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

const fakeFrameOrigin: BrowserCommand<[origin: string, html: string, delayMs?: number]> = async (
  { page },
  origin,
  html,
  delayMs = 0,
) => {
  const fakedOrigin = new URL(origin).origin;
  const matcher = (url: URL) => url.origin === fakedOrigin;
  const handler: FrameRouteHandler = async (route) => {
    const request = route.request();
    if (request.resourceType() !== 'document' || !request.frame().parentFrame()) {
      await route.fallback();
      return;
    }
    if (delayMs > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
    try {
      await route.fulfill({ contentType: 'text/html', body: html });
    } catch {
      // The frame gave up waiting and was removed, or the spec ended: nothing to answer.
    }
  };
  await page.route(matcher, handler);
  frameFakes.set(page, [...(frameFakes.get(page) ?? []), { matcher, handler }]);
};

const failFrameOrigin: BrowserCommand<[origin: string]> = async ({ page }, origin) => {
  const failedOrigin = new URL(origin).origin;
  const matcher = (url: URL) => url.origin === failedOrigin;
  const handler: FrameRouteHandler = (route) => route.abort('connectionrefused');
  await page.route(matcher, handler);
  frameFakes.set(page, [...(frameFakes.get(page) ?? []), { matcher, handler }]);
};

// A script a faked frame runs, bundled into one module with what it imports, since the
// frame is on another origin and can load nothing from the test server. Built once per
// entry for the whole run.
const frameScripts = new Map<string, Promise<string>>();

async function buildFrameScript(entry: string): Promise<string> {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const result = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    publicDir: false,
    resolve: sharedResolve,
    build: {
      write: false,
      minify: false,
      copyPublicDir: false,
      lib: { entry, formats: ['es'], fileName: 'frame' },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  const chunk = outputs
    .flatMap(({ output }) => output)
    .find((file): file is Rolldown.OutputChunk => file.type === 'chunk' && file.isEntry);
  if (!chunk) {
    throw new Error(`Bundling ${entry} for a frame produced no script`);
  }
  return chunk.code;
}

const bundleFrameScript: BrowserCommand<[entry: string]> = (_context, entry) => {
  let script = frameScripts.get(entry);
  if (!script) {
    script = buildFrameScript(entry);
    // A failed build is retried by the next spec rather than failing every one after it.
    script.catch(() => frameScripts.delete(entry));
    frameScripts.set(entry, script);
  }
  return script;
};

// How long `callInFrame` waits for Playwright to see a frame the page already shows. Another
// origin's frame runs in a process of its own, which Playwright attaches to on its own time:
// on a busy machine, after the page has heard from the frame.
const FRAME_ATTACH_TIMEOUT_MS = 5000;

// Calls a hook the script in a faked frame exposes on `window.__app`, in the newest frame
// on `origin`: the frame is another origin's, so the spec can't reach into it itself.
const callInFrame: BrowserCommand<[origin: string, hook: string, args: unknown[]]> = async (
  { page },
  origin,
  hook,
  args,
) => {
  const newestOnOrigin = () =>
    page
      .frames()
      .filter(
        (candidate) => URL.canParse(candidate.url()) && new URL(candidate.url()).origin === origin,
      )
      .at(-1);
  const deadline = Date.now() + FRAME_ATTACH_TIMEOUT_MS;
  let frame = newestOnOrigin();
  while (!frame && Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    frame = newestOnOrigin();
  }
  if (!frame) {
    throw new Error(`No frame on ${origin} to call ${hook} in`);
  }
  return frame.evaluate(
    ([name, rest]) => {
      const hooks = (globalThis as { __app?: Record<string, (...a: unknown[]) => unknown> }).__app;
      if (!hooks?.[name]) {
        throw new Error(`The frame has no ${name} hook`);
      }
      return hooks[name](...rest);
    },
    [hook, args] as const,
  );
};

const resetFakeFrameOrigins: BrowserCommand<[]> = async ({ page }) => {
  const fakes = frameFakes.get(page) ?? [];
  frameFakes.delete(page);
  await Promise.all(fakes.map(({ matcher, handler }) => page.unroute(matcher, handler)));
};

// Module requests fail as a dropped connection would (test-utils/acceptance/module-loads.ts).
// Routed on the context: the page's routes never see what MSW's service worker fetches.
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
  // Serves the MSW service worker script; scoped to the test config so it
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
        bundleFrameScript,
        callInFrame,
        failFrameOrigin,
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
