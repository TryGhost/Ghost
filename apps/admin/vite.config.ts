import fs from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
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

// Ghost's port when it runs on the host behind this dev server
const GHOST_DEV_BACKEND_PORT = process.env.GHOST_DEV_BACKEND_PORT;

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

// Vite listens on one address, and `*.localhost` names can resolve to ::1 first
function ipv6LoopbackPlugin(): PluginOption {
  return {
    name: 'ipv6-loopback',
    apply: 'serve',
    configureServer({ config, httpServer }) {
      if (!httpServer || config.server.host !== '127.0.0.1') {
        return;
      }
      httpServer.once('listening', () => {
        const { port } = httpServer.address() as AddressInfo;
        const ipv6 = createServer((socket) => httpServer.emit('connection', socket));
        ipv6
          .on('error', (error: NodeJS.ErrnoException) => {
            // Without IPv6, clients fall back to 127.0.0.1
            if (error.code !== 'EADDRNOTAVAIL' && error.code !== 'EAFNOSUPPORT') {
              throw error;
            }
          })
          .listen(port, '::1');
        httpServer.once('close', () => ipv6.close());
      });
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
          GHOST_DEV_BACKEND_PORT
            ? ghostFrontDoorPlugin(
                `http://127.0.0.1:${GHOST_DEV_BACKEND_PORT}`,
                `${getSubdir()}${DEV_BASE}`,
              )
            : ghostBackendProxyPlugin(),
          ipv6LoopbackPlugin(),
          // Sentry's plugin goes after all others
          sentryDebugIdsPlugin(),
        ]),
  ],
  build: {
    sourcemap: 'hidden',
  },
  define: sharedDefine,
  server: {
    // Containers on Linux reach the host through the Docker bridge, and a devcontainer's
    // published port reaches its network interface: those set GHOST_DEV_LISTEN=0.0.0.0
    host: process.env.GHOST_DEV_LISTEN ?? '127.0.0.1',
    port: GHOST_DEV_BACKEND_PORT ? Number(process.env.GHOST_DEV_PORT ?? 2368) : 5174,
    strictPort: Boolean(GHOST_DEV_BACKEND_PORT),
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
