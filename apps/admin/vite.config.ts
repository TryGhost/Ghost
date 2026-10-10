import fs from 'node:fs';
import { configDefaults, defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

import { ghostBackendProxyPlugin } from './vite-backend-proxy';
import { ghostFrontDoorPlugin } from './vite-front-door';
import { sharedDefine, sharedResolve } from './vite.shared';

export const GHOST_URL = process.env.GHOST_URL ?? 'http://localhost:2368/';

// Ghost running on the host behind this dev server, e.g. http://127.0.0.1:2369
const GHOST_DEV_BACKEND = process.env.GHOST_DEV_BACKEND;

// `pnpm dev:lexical` rebuilds koenig-lexical's dist; serving it unbundled picks up each rebuild
const KOENIG_WATCH = Boolean(process.env.GHOST_DEV_KOENIG_WATCH);

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

// Rolldown ignores a dependency's `//# sourceMappingURL`, so without this the
// chunk map's only source for Koenig frames is its already-minified dist
function koenigSourcemapPlugin(): PluginOption {
  return {
    name: 'koenig-sourcemap',
    apply: 'build',
    load(id) {
      if (!/\/koenig-lexical\/dist\/koenig-lexical\.js$/.test(id)) {
        return null;
      }
      return { code: fs.readFileSync(id, 'utf-8'), map: fs.readFileSync(`${id}.map`, 'utf-8') };
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  base: getBase(command),
  plugins: [
    tailwindcss() as PluginOption,
    svgr(),
    react(),
    koenigSourcemapPlugin(),
    // Unit tests have no Ghost backend. Keep filesystem and
    // shipping side effects out of this lane, including Sentry uploads.
    ...(command === 'serve' && mode === 'test'
      ? []
      : [
          GHOST_DEV_BACKEND
            ? ghostFrontDoorPlugin(GHOST_DEV_BACKEND, `${getSubdir()}${DEV_BASE}`)
            : ghostBackendProxyPlugin(),
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
    port: GHOST_DEV_BACKEND ? Number(process.env.GHOST_DEV_PORT ?? 2368) : 5174,
    strictPort: Boolean(GHOST_DEV_BACKEND),
    allowedHosts: true,
    // Vite 8 already forwards browser console warn/error to the terminal
    // when it detects an AI agent is driving the dev server, and stays
    // quiet for humans. Uncomment to force it on for everyone (noisier):
    // forwardConsole: { logLevels: ['warn', 'error'] }
  },
  optimizeDeps: KOENIG_WATCH
    ? { exclude: ['@tryghost/koenig-lexical'] }
    : { include: ['@tryghost/koenig-lexical'] },
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
