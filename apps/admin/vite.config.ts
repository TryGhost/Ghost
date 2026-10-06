import { configDefaults, defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

import { emberAssetsPlugin } from './vite-ember-assets';
import { ghostBackendProxyPlugin } from './vite-backend-proxy';
import { sharedDefine, sharedResolve } from './vite.shared';

export const GHOST_URL = process.env.GHOST_URL ?? 'http://localhost:2368/';

// Dev-only prefix Vite serves under. Keeps Vite's internals (HMR client,
// module graph, refresh runtime) off `/ghost/*` so Ghost's Express middleware
// owns user-facing admin URLs in both dev and prod.
export const DEV_BASE = '/__admin-dev__';

/**
 * Extracts the subdirectory path from GHOST_URL.
 * e.g., "http://localhost:2368/blog/" -> "/blog"
 *       "http://localhost:2368/" -> ""
 */
export function getSubdir(): string {
  const url = new URL(GHOST_URL);
  return url.pathname.replace(/\/$/, '');
}

function getBase(command: 'build' | 'serve'): string {
  if (process.env.GHOST_CDN_URL) {
    return process.env.GHOST_CDN_URL;
  }
  if (command === 'build') {
    return './';
  }
  return `${getSubdir()}${DEV_BASE}`;
}

// Injects Sentry debug IDs on shipping builds; CI uploads the maps afterwards
function sentryDebugIdsPlugin(): PluginOption {
  if (!process.env.IS_SHIPPING) {
    return null;
  }

  return sentryVitePlugin({
    sourcemaps: { disable: 'disable-upload' },
    release: { inject: false },
    telemetry: false,
  });
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  base: getBase(command),
  plugins: [
    tailwindcss() as PluginOption,
    svgr(),
    react(),
    // Unit tests have no Ghost backend or Ember assets. Keep filesystem and
    // shipping side effects out of this lane, including Sentry uploads.
    ...(command === 'serve' && mode === 'test'
      ? []
      : [
          emberAssetsPlugin(),
          ghostBackendProxyPlugin(),
          // Sentry's plugin goes after all others
          sentryDebugIdsPlugin(),
        ]),
  ],
  build: {
    sourcemap: 'hidden',
  },
  define: sharedDefine,
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
    // Vite's default localhost allowlist, plus Tailscale hosts so an Admin
    // served from a *.ts.net URL can fetch dev-apps/ manifests.
    cors: {
      origin:
        /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\]|[^:/]+\.ts\.net)(?::\d+)?$/,
    },
    // Vite 8 already forwards browser console warn/error to the terminal
    // when it detects an AI agent is driving the dev server, and stays
    // quiet for humans. Uncomment to force it on for everyone (noisier):
    // forwardConsole: { logLevels: ['warn', 'error'] }
  },
  optimizeDeps: {
    include: ['@tryghost/koenig-lexical'],
  },
  resolve: sharedResolve,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-utils/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test-utils/**/*.test.ts'],
    // Acceptance and component tests run in a real browser via
    // vitest.acceptance.config.ts
    exclude: [
      ...configDefaults.exclude,
      'src/**/*.acceptance.test.tsx',
      'src/**/*.component.test.tsx',
    ],
  },
}));
