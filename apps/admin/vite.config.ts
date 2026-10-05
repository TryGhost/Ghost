import { createRequire } from 'node:module';
import { configDefaults, defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

import { emberAssetsPlugin } from './vite-ember-assets';
import { embedRendererPlugin } from './vite-embed-renderer';
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

// Uploads the build's sourcemaps to Sentry; shipping builds only, as for Koenig
function sentrySourcemapsPlugin(): PluginOption {
  if (!process.env.IS_SHIPPING) {
    return null;
  }

  // Matches the release Admin's Sentry client reports once `/config/` has loaded
  const require = createRequire(import.meta.url);
  const { version } = require('../../ghost/core/package.json') as { version: string };

  return sentryVitePlugin({
    org: 'ghost-foundation',
    project: 'admin',
    authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
    release: {
      name: `ghost@${process.env.GHOST_BUILD_VERSION || version}`,
      inject: false,
    },
    telemetry: false,
  });
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: getBase(command),
  plugins: [
    tailwindcss() as PluginOption,
    react(),
    emberAssetsPlugin(),
    embedRendererPlugin(),
    ghostBackendProxyPlugin(),
    // Sentry's plugin goes after all others
    sentrySourcemapsPlugin(),
  ],
  build: {
    sourcemap: 'hidden',
  },
  define: sharedDefine,
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
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
