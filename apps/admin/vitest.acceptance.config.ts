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
const imageRequests = new WeakMap<BrowserPage, string[]>();
const heldImages = new WeakMap<BrowserPage, Set<() => void>>();

const releaseHeldImages = (page: BrowserPage) => {
  heldImages.get(page)?.forEach((release) => release());
  heldImages.delete(page);
};
const releaseFrameImages: BrowserCommand<[]> = ({ page }) => {
  releaseHeldImages(page);
  return Promise.resolve();
};

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
  releaseHeldImages(page);
  const fakes = frameFakes.get(page) ?? [];
  frameFakes.delete(page);
  imageRequests.delete(page);
  await Promise.all(fakes.map(({ matcher, handler }) => page.unroute(matcher, handler)));
};

// Opaque preview resources bypass MSW, just like iframe navigations.
const fakeFrameImage: BrowserCommand<
  [url: string, png: string, cors: boolean, hold?: boolean]
> = async ({ page }, url, png, cors, hold = false) => {
  const address = new URL(url).href;
  const matcher = (request: URL) => request.href === address;
  const handler: FrameRouteHandler = async (route) => {
    imageRequests.set(page, [...(imageRequests.get(page) ?? []), route.request().url()]);
    if (hold) {
      await new Promise<void>((resolve) => {
        const releases = heldImages.get(page) ?? new Set<() => void>();
        releases.add(resolve);
        heldImages.set(page, releases);
      });
    }
    return route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(png, 'base64'),
      headers: cors ? { 'access-control-allow-origin': '*' } : {},
    });
  };
  await page.route(matcher, handler);
  frameFakes.set(page, [...(frameFakes.get(page) ?? []), { matcher, handler }]);
};
const getFrameImageRequests: BrowserCommand<[]> = ({ page }) =>
  Promise.resolve(imageRequests.get(page) ?? []);

type CanvasPointerAction =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'down' | 'up' | 'space-down' | 'space-up' | 'escape' };
const canvasPointer: BrowserCommand<[actions: CanvasPointerAction[]]> = async (
  { page },
  actions,
) => {
  const tester = await page.locator('[data-vitest="true"]').boundingBox();
  if (!tester) {
    throw new Error('The browser test viewport is not available.');
  }
  for (const action of actions) {
    if (action.kind === 'move') {
      await page.mouse.move(tester.x + action.x, tester.y + action.y);
    } else if (action.kind === 'down') {
      await page.mouse.down();
    } else if (action.kind === 'up') {
      await page.mouse.up();
    } else if (action.kind === 'space-down') {
      await page.keyboard.down('Space');
    } else if (action.kind === 'space-up') {
      await page.keyboard.up('Space');
    } else {
      await page.keyboard.press('Escape');
    }
  }
};

const canvasInputValue: BrowserCommand<[title: string, label: string]> = (
  { iframe },
  title,
  label,
) =>
  iframe
    .frameLocator(`iframe[title="${title}"]`)
    .getByRole('textbox', { name: label, exact: true })
    .inputValue();
const canvasFocusInput: BrowserCommand<[title: string, label: string]> = (
  { iframe },
  title,
  label,
) =>
  iframe
    .frameLocator(`iframe[title="${title}"]`)
    .getByRole('textbox', { name: label, exact: true })
    .focus();
const canvasPointerSizes = new WeakMap<
  BrowserPage,
  { size: { width: number; height: number }; transform: string }
>();
const canvasPointerViewport: BrowserCommand<[enabled: boolean]> = async ({ page }, enabled) => {
  if (enabled) {
    const size = page.viewportSize();
    if (size) {
      const transform = await page.locator('[data-vitest="true"]').evaluate((element) => {
        const wrapper = element.parentElement!;
        const previous = wrapper.style.transform;
        wrapper.style.transform = 'none';
        return previous;
      });
      canvasPointerSizes.set(page, { size, transform });
    }
    // The runner otherwise scales its 1280x800 tester to fit a 1280x720 outer
    // page. Native screen-coordinate tests need an unscaled tester viewport.
    await page.setViewportSize({ width: 1600, height: 1000 });
  } else {
    const size = canvasPointerSizes.get(page);
    if (size) {
      await page.locator('[data-vitest="true"]').evaluate((element, transform) => {
        element.parentElement!.style.transform = transform;
      }, size.transform);
      await page.setViewportSize(size.size);
      canvasPointerSizes.delete(page);
    }
  }
};

type NativeCanvasTesting = {
  listTools: () => Array<{ name: string }>;
  executeTool: (name: string, input: string) => Promise<string | null>;
};
const canvasNativeTools: BrowserCommand<[]> = ({ page }) =>
  page.evaluate(() => {
    const testing = (navigator as Navigator & { modelContextTesting?: NativeCanvasTesting })
      .modelContextTesting;
    return testing ? testing.listTools().map((tool) => tool.name) : [];
  });
const canvasNativeTool: BrowserCommand<[name: string, input: Record<string, unknown>]> = (
  { page },
  name,
  input,
) =>
  page.evaluate(
    async ({ name: toolName, input: toolInput }) => {
      const testing = (navigator as Navigator & { modelContextTesting?: NativeCanvasTesting })
        .modelContextTesting;
      if (!testing) {
        throw new Error('Native WebMCP testing is unavailable.');
      }
      const result = await testing.executeTool(toolName, JSON.stringify(toolInput));
      if (result === null) {
        throw new Error('The native tool did not return an editor result.');
      }
      return JSON.parse(result) as Record<string, unknown>;
    },
    { name, input },
  );

export default defineConfig({
  plugins: [tailwindcss() as PluginOption, react()],
  server: {
    // Vitest owns console reporting; Vite forwarding bypasses silent below.
    forwardConsole: false,
  },
  // Serves the MSW service worker script; scoped to the test config so it
  // never ends up in the production build's public assets.
  publicDir: './test-utils/acceptance/public',
  define: sharedDefine,
  optimizeDeps: {
    include: [
      '@earendil-works/pi-agent-core',
      '@earendil-works/pi-ai',
      '@tryghost/theme-renderer',
      'html2canvas-pro',
      'js-yaml',
      'jszip',
    ],
    // Scan every app module so deps behind lazy routes are pre-bundled up
    // front — mid-run discovery reloads the test page and flakes the
    // suite. Test files and screen helpers import test-lane modules the
    // browser bundler can't process; vitest serves those itself.
    entries: ['src/**/*.{ts,tsx}', '!src/**/*.test.*', '!src/**/*.screen.ts'],
  },
  resolve: sharedResolve,
  test: {
    name: 'acceptance',
    // Print totals and failures, without per-test output that CI expands into
    // separate lines. Use --silent=false --reporter=verbose to debug.
    silent: 'passed-only',
    reporters: process.env.GITHUB_ACTIONS ? ['minimal', 'github-actions', 'json'] : ['minimal'],
    // Keep per-test timings and failure details without expanding the CI log.
    outputFile: { json: './test-results/acceptance.json' },
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
      provider: playwright({
        launchOptions: {
          args:
            process.env.VITE_CANVAS_NATIVE_WEBMCP === '1'
              ? [
                  '--enable-experimental-web-platform-features',
                  '--enable-features=WebMCPTesting,DevToolsWebMCPSupport',
                ]
              : [],
        },
      }),
      commands: {
        fakeFrameOrigin,
        fakeFrameImage,
        getFrameImageRequests,
        canvasPointer,
        canvasInputValue,
        canvasFocusInput,
        canvasPointerViewport,
        canvasNativeTools,
        canvasNativeTool,
        releaseFrameImages,
        guardFrameNavigations,
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
