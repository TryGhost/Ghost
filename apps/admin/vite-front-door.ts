import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import sirv from 'sirv';
import type { Plugin, ProxyOptions } from 'vite';

// Built to apps/<name>/umd by each app's `vite build --watch`
const PUBLIC_APPS = [
  'portal',
  'comments-ui',
  'signup-form',
  'sodo-search',
  'announcement-bar',
  'admin-toolbar',
];

const stripPrefix = (prefix: RegExp) => (url: string) => url.replace(prefix, '');

/**
 * Makes the Admin dev server the single entry point for local development, with
 * Ghost running behind it on `backend`. Ghost rejects Admin API requests whose
 * Origin doesn't match its configured url, so the browser must only ever see
 * this server's origin.
 */
export function ghostFrontDoorPlugin(backend: string, devBase: string): Plugin {
  const appsDir = path.resolve(__dirname, '..');
  const publicApps = new Map(
    PUBLIC_APPS.map((name) => [name, sirv(path.join(appsDir, name, 'umd'), { dev: true })]),
  );

  return {
    name: 'ghost-front-door',

    config() {
      const proxy: Record<string, ProxyOptions> = {};
      if (process.env.ANALYTICS_PROXY_TARGET) {
        proxy['^/\\.ghost/analytics/'] = {
          target: `http://${process.env.ANALYTICS_PROXY_TARGET}`,
          rewrite: stripPrefix(/^\/\.ghost\/analytics/),
        };
      }
      // The ActivityPub project's local service
      const activityPub = process.env.ACTIVITYPUB_PROXY_TARGET ?? '127.0.0.1:8080';
      for (const route of ['^/\\.ghost/activitypub/', '^/\\.well-known/(webfinger|nodeinfo)']) {
        proxy[route] = { target: `http://${activityPub}` };
      }
      // Must stay last: Vite uses the first matching entry
      proxy[`^(?!${devBase})`] = { target: backend, xfwd: true, ws: true };
      return { server: { proxy } };
    },

    configureServer(server) {
      const { logger } = server.config;
      // Ghost answers 503 until it has booted, and the proxy 500s before it listens.
      // Not `/`, which renders the theme.
      const isUp = () =>
        fetch(new URL('/ghost/api/admin/site/', backend), { redirect: 'manual' }).then(
          (res) => res.status < 500,
          () => false,
        );
      const ready = (async () => {
        while (!(await isUp())) {
          await sleep(500);
        }
      })();

      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        logger.info('  Waiting for Ghost…');
        const hostname = process.env.GHOST_DEV_HOSTNAME ?? 'localhost';
        void ready.then(() =>
          logger.info(`  ➜  Ghost:   http://${hostname}:${server.config.server.port}/ghost/`),
        );
      };

      server.middlewares.use((_req, _res, next) => {
        void ready.then(() => next());
      });

      // Registered here, before Vite's own middleware and proxy
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (url === '/ghost' || url === '/ghost/') {
          req.url = `${devBase}/`;
          return next();
        }
        const asset = /^\/ghost\/assets\/([^/]+)(\/.*)$/.exec(url);
        if (asset) {
          const [, name, rest] = asset;
          const serveApp = publicApps.get(name);
          if (serveApp) {
            req.url = rest;
            return serveApp(req, res, () => {
              res.statusCode = 404;
              res.end();
            });
          }
          if (name !== 'koenig-lexical') {
            req.url = `${devBase}/assets/${name}${rest}`;
          }
        }
        next();
      });
    },
  };
}
