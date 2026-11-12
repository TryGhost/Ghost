import { connect, type Socket } from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import sirv from 'sirv';
import type { Plugin, ProxyOptions } from 'vite';

// Built to apps/<name>/umd by each app's `build`, or its watcher under `pnpm dev:public`
const PUBLIC_APPS = [
  'portal',
  'comments-ui',
  'signup-form',
  'sodo-search',
  'announcement-bar',
  'admin-toolbar',
];

const stripPrefix = (prefix: RegExp) => (url: string) => url.replace(prefix, '');

// Local services with their own proxies, which match on the path as the browser sent it
const ANALYTICS_ROUTE = '^/\\.ghost/analytics/';
const ACTIVITYPUB_ROUTES = ['^/\\.ghost/activitypub/', '^/\\.well-known/(webfinger|nodeinfo)'];

const SECOND_GHOST_PREFIX = '/__ghost-2__';

/**
 * Which of `pnpm dev:multi`'s two Ghosts answers a request: the one its `X-Ghost-Target`
 * header names, or each in turn without the header. Undefined for any other header value.
 */
export function ghostPicker(): (target?: string | string[]) => 1 | 2 | undefined {
  let last: 1 | 2 = 2;
  return (target) => {
    if (target === undefined) {
      last = last === 1 ? 2 : 1;
      return last;
    }
    return target === '1' ? 1 : target === '2' ? 2 : undefined;
  };
}

/**
 * Makes the Admin dev server the single entry point for local development, with
 * Ghost running behind it on `backend`. Ghost rejects Admin API requests whose
 * Origin doesn't match its configured url, so the browser must only ever see
 * this server's origin. `pnpm dev:multi` adds a second Ghost on `secondGhost`;
 * without it, there's one Ghost and nothing to route.
 */
export function ghostFrontDoorPlugin(
  backend: string,
  devBase: string,
  secondGhost?: string,
): Plugin {
  const appsDir = path.resolve(__dirname, '..');
  const publicApps = new Map(
    PUBLIC_APPS.map((name) => [name, sirv(path.join(appsDir, name, 'umd'), { dev: true })]),
  );
  const ghosts = secondGhost ? [backend, secondGhost] : [backend];

  return {
    name: 'ghost-front-door',

    config() {
      const proxy: Record<string, ProxyOptions> = {};
      if (process.env.ANALYTICS_PROXY_TARGET) {
        proxy[ANALYTICS_ROUTE] = {
          target: `http://${process.env.ANALYTICS_PROXY_TARGET}`,
          rewrite: stripPrefix(/^\/\.ghost\/analytics/),
        };
      }
      // The ActivityPub project's local service. Default matches the old Docker gateway.
      // Without a listener, answer 404 so Ghost treats the site as having no
      // ActivityPub service routed.
      const activityPub = process.env.ACTIVITYPUB_PROXY_TARGET ?? '127.0.0.1:8080';
      for (const route of ACTIVITYPUB_ROUTES) {
        proxy[route] = {
          target: `http://${activityPub}`,
          configure: (p) =>
            p.on('error', (_err, _req, res) => {
              if ('writeHead' in res && !res.headersSent) {
                res.writeHead(404).end();
              }
            }),
        };
      }
      const servedBy =
        (name: string): ProxyOptions['configure'] =>
        (p) =>
          p.on('proxyRes', (res) => {
            res.headers['x-ghost-served-by'] = name;
          });
      if (secondGhost) {
        proxy[`^${SECOND_GHOST_PREFIX}`] = {
          target: secondGhost,
          xfwd: true,
          rewrite: stripPrefix(new RegExp(`^${SECOND_GHOST_PREFIX}`)),
          configure: servedBy('2'),
        };
      }
      // Must stay last: Vite uses the first matching entry
      proxy[`^(?!${devBase})`] = {
        target: backend,
        xfwd: true,
        ws: true,
        ...(secondGhost ? { configure: servedBy('1') } : {}),
      };
      return { server: { proxy } };
    },

    configureServer(server) {
      const { logger } = server.config;
      // Ghost answers 503 until it has booted, and the proxy 500s before it listens.
      // Not `/`, which renders the theme.
      const isUp = (ghost: string) =>
        fetch(new URL('/ghost/api/admin/site/', ghost), { redirect: 'manual' }).then(
          (res) => res.status < 500,
          () => false,
        );
      const waitForGhost = async () => {
        while (!(await Promise.all(ghosts.map(isUp))).every(Boolean)) {
          await sleep(500);
        }
      };
      let ready = waitForGhost();

      // A nodemon restart closes every connection to Ghost, so an idle one held open notices
      // the restart before the next request does. A running Ghost times it out with a 408.
      const watchers = new Map<string, Socket>();
      const watchForRestart = (ghost: string) =>
        void ready.then(() => {
          const { hostname, port } = new URL(ghost);
          let timedOut = false;
          const watcher = connect(Number(port), hostname).unref();
          watchers.set(ghost, watcher);
          watcher.once('data', () => (timedOut = true));
          watcher.on('error', () => {});
          watcher.once('close', () => {
            if (server.httpServer?.listening) {
              if (!timedOut) {
                ready = waitForGhost();
              }
              watchForRestart(ghost);
            }
          });
        });
      ghosts.forEach(watchForRestart);
      server.httpServer?.once('close', () => {
        for (const watcher of watchers.values()) {
          watcher.destroy();
        }
      });

      // Vite's own URLs point at the internal dev base, not at Ghost
      server.printUrls = () => {
        logger.info('  Waiting for Ghost…');
        const site = `http://${process.env.GHOST_DEV_HOSTNAME ?? 'localhost'}:${server.config.server.port}/`;
        void ready.then(() => {
          logger.info(`  ➜  Site:   ${site}`);
          logger.info(`  ➜  Admin:  ${site}ghost/`);
          // Mailpit's web interface, published by compose.dev.yaml and shared by every checkout
          logger.info('  ➜  Email:  http://localhost:8025/');
        });
      };

      server.middlewares.use((_req, _res, next) => {
        void ready.then(() => next());
      });

      // Codespaces' port forwarding rewrites a same-origin Origin to the localhost Host it
      // forwards to, but not the Referer, so Ghost's origin check needs the public origin back
      server.middlewares.use((req, _res, next) => {
        const forwardedHost = req.headers['x-forwarded-host'];
        if (
          typeof forwardedHost === 'string' &&
          req.headers.origin === `http://${req.headers.host}`
        ) {
          const proto = req.headers['x-forwarded-proto'];
          req.headers.origin = `${typeof proto === 'string' ? proto : 'https'}://${forwardedHost}`;
        }
        next();
      });

      // Registered here, before Vite's own middleware and proxy
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        // Bare `/ghost` goes to Ghost, which redirects it to `/ghost/`
        if (url === '/ghost/') {
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
          req.url = `${devBase}/assets/${name}${rest}`;
        }
        next();
      });

      if (secondGhost) {
        const pickGhost = ghostPicker();
        const serviceRoutes = [ANALYTICS_ROUTE, ...ACTIVITYPUB_ROUTES].map(
          (route) => new RegExp(route),
        );
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          if (url.startsWith(devBase) || serviceRoutes.some((route) => route.test(url))) {
            return next();
          }
          const ghost = pickGhost(req.headers['x-ghost-target']);
          if (!ghost) {
            res.statusCode = 400;
            res.end('X-Ghost-Target must be 1 or 2\n');
            return;
          }
          if (ghost === 2) {
            req.url = `${SECOND_GHOST_PREFIX}${url}`;
          }
          next();
        });
      }
    },
  };
}
