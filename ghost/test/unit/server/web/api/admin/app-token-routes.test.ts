import assert from 'node:assert/strict';
import type { RequestHandler, Router } from 'express';

import {
  createAppTokenAuthentication,
  refuseUnauthenticatedAppToken,
} from '../../../../../../core/server/auth/app-token';
import {
  mountAuthenticated,
  refuseAppTokensByDefault,
} from '../../../../../../core/server/web/api/endpoints/admin/app-token-routes';
import {
  adminApiRouter,
  adminApiRoutes,
  appTokenAccess,
  isRouter,
  type MountedRouter,
} from '../../../../../utils/admin-api-routes';

const express = require('../../../../../../core/shared/express');

type Layer = MountedRouter['stack'][number];

const handler: RequestHandler = (_req, _res, next) => next();
const limiter: RequestHandler = (_req, _res, next) => next();
const authenticate = createAppTokenAuthentication({
  isAppsEnabled: () => true,
  validate: async () => null,
  findInstallation: async () => null,
  findActiveUser: async () => null,
});

/** What each route on a router runs, by path, and what each of its other layers is. */
function mounted(router: Router) {
  const layers = (router as unknown as MountedRouter).stack;
  return {
    routes: Object.fromEntries(
      layers.flatMap(({ route }) =>
        route ? [[String(route.path), route.stack.map((layer) => layer.handle)]] : [],
      ),
    ) as Record<string, unknown[]>,
    layers: layers.filter(({ route }) => !route).map((layer) => layer.handle),
  };
}

describe('Refusing app tokens by default on a router', function () {
  it('starts a route with the refusal unless app token authentication comes first', function () {
    const router: Router = refuseAppTokensByDefault(express.Router('test'));
    router.get('/public', handler);
    router.post('/limited', limiter, [handler]);
    router.all(['/any', '/any/*'], handler);
    router.patch('/patched', handler);
    router.get('/private', [authenticate, handler], handler);
    // As the routes file nests one chain in another, which Express takes and its types don't
    router.put('/nested', [[authenticate], [handler]] as unknown as RequestHandler[], handler);

    const { routes } = mounted(router);
    assert.deepEqual(routes['/public'], [refuseUnauthenticatedAppToken, handler]);
    assert.deepEqual(routes['/limited'], [refuseUnauthenticatedAppToken, limiter, handler]);
    assert.equal(routes['/any,/any/*']?.[0], refuseUnauthenticatedAppToken);
    assert.equal(routes['/patched']?.[0], refuseUnauthenticatedAppToken);
    assert.deepEqual(routes['/private'], [authenticate, handler, handler]);
    assert.deepEqual(routes['/nested'], [authenticate, handler, handler]);
  });

  // Something ahead of authentication would see the app as whoever else is calling
  it('refuses first on a route that authenticates an app token after something else', function () {
    const router: Router = refuseAppTokensByDefault(express.Router('test'));
    router.post('/limited', limiter, authenticate, handler);
    router.get('/deep', [[limiter], [authenticate]] as unknown as RequestHandler[], handler);

    const { routes } = mounted(router);
    assert.deepEqual(routes['/limited'], [
      refuseUnauthenticatedAppToken,
      limiter,
      authenticate,
      handler,
    ]);
    assert.equal(routes['/deep']?.[0], refuseUnauthenticatedAppToken);
  });

  it('covers a route made with router.route(), each time handlers are mounted on it', function () {
    const router: Router = refuseAppTokensByDefault(express.Router('test'));
    router.route('/chained').get(handler).post(authenticate, handler).all(limiter);

    assert.deepEqual(mounted(router).routes['/chained'], [
      refuseUnauthenticatedAppToken,
      handler,
      authenticate,
      handler,
      refuseUnauthenticatedAppToken,
      limiter,
    ]);
  });

  it('puts the refusal ahead of a router, and of anything mounted at a path', function () {
    const router: Router = refuseAppTokensByDefault(express.Router('test'));
    const before = mounted(router).layers.length;
    const child: Router = express.Router('child');
    const other: Router = express.Router('other');
    router.use(handler);
    router.use([handler, limiter]);
    router.use('/child', limiter, child);
    router.use('/other', other);
    router.use('/terminal', handler);
    router.use(['/a', '/b'], authenticate, handler);

    assert.deepEqual(mounted(router).layers.slice(before), [
      // Middleware for every request is left as it is
      handler,
      handler,
      limiter,
      refuseUnauthenticatedAppToken,
      limiter,
      child,
      refuseUnauthenticatedAppToken,
      other,
      refuseUnauthenticatedAppToken,
      handler,
      authenticate,
      handler,
    ]);
  });

  // A refusal ahead of it would be at `/`, so it would close every later route to apps
  it('won’t mount a router without a path', function () {
    const router: Router = refuseAppTokensByDefault(express.Router('test'));
    for (const mount of [
      () => router.use(express.Router('child')),
      () => router.use(handler, express.Router('child')),
      () => router.use([[express.Router('child')]] as unknown as RequestHandler[]),
    ]) {
      assert.throws(mount, /Mount a router at a path/);
    }
  });

  it('mounts a router behind a chain that runs as a route ahead of it', function () {
    const router: Router = refuseAppTokensByDefault(express.Router('test'));
    const before = mounted(router).layers.length;
    const child: Router = express.Router('child');
    mountAuthenticated(router, '/child', [authenticate, handler], child);

    const { routes, layers } = mounted(router);
    assert.deepEqual(routes['/child,/child/*'], [authenticate, handler]);
    assert.deepEqual(layers.slice(before), [refuseUnauthenticatedAppToken, child]);
    const stack = (router as unknown as MountedRouter).stack;
    assert.ok(
      stack.findIndex(({ route }) => route) < stack.findIndex(({ handle }) => handle === child),
    );
  });
});

// The router the Admin API mounts. A route is open to a request carrying an app token only
// when app token authentication is the first thing it runs; every other route refuses it first.
describe('The Admin API’s routes and app tokens', function () {
  // Required, as the routes file is CommonJS: these are the handlers it mounted
  const core = '../../../../../../core';
  const refusal = require(`${core}/server/auth/app-token`).refuseUnauthenticatedAppToken;
  const { authenticatesAppTokens } = require(`${core}/server/auth/app-token`);
  const { APP_UNCHECKED_ALLOWLIST } = require(`${core}/server/api/endpoints/utils/permissions`);
  const refuseAppEarly = require(
    `${core}/server/web/api/endpoints/admin/middleware`,
  ).authAdminApi.find((each: { name: string }) => each.name === 'refuseAppEarly');
  const auth = require(`${core}/server/auth`);
  // Middleware the routers mount for every request, which runs ahead of each route's own
  const FOR_EVERY_REQUEST = new Set<unknown>(
    [
      require(`${core}/shared/sentry`).errorHandler,
      require(`${core}/server/web/api/middleware`).cors,
    ].flat(),
  );

  const startsRight = (handle: unknown) => handle === refusal || authenticatesAppTokens(handle);

  /** Everything wrong with how a router's layers treat an app token, read from its stack. */
  function problems(router: MountedRouter, name: string): string[] {
    return router.stack.flatMap((layer: Layer, index: number): string[] => {
      const previous = router.stack[index - 1];
      if (layer.route) {
        const { route } = layer;
        // What a request with each method runs first on the route
        const verbs = Object.keys(route.methods).filter((verb) => verb !== '_all');
        return (verbs.length > 0 ? verbs : [undefined])
          .filter((verb) => {
            const first = route.stack.find((each) => !each.method || each.method === verb);
            return !startsRight(first?.handle);
          })
          .map((verb) => `${name}: ${(verb ?? 'all').toUpperCase()} ${String(route.path)}`);
      }
      if (layer.handle === refusal || FOR_EVERY_REQUEST.has(layer.handle)) {
        return [];
      }
      const guarded =
        previous?.handle === refusal && previous.regexp.source === layer.regexp.source;
      return guarded
        ? []
        : [`${name}: a ${isRouter(layer.handle) ? 'router' : 'layer'} mounted at ${layer.regexp}`];
    });
  }

  it('starts every route by refusing an app token or authenticating it, however it is mounted', function () {
    assert.deepEqual(problems(adminApiRouter(), 'the Admin API'), []);
    assert.ok(adminApiRouter().stack.filter(({ route }) => route).length > 250);
  });

  // Better Auth's own routes authenticate nobody, so every one of them refuses an app's token
  it('starts every Better Auth route by refusing an app token', function () {
    const { betterAuthRouter } = require(`${core}/server/web/api/endpoints/admin/better-auth`);
    const router = betterAuthRouter({ handler: async () => new Response() }) as MountedRouter;
    const routes = router.stack.filter(({ route }) => route);

    assert.deepEqual(problems(router, 'Better Auth'), []);
    assert.ok(routes.length > 0);
    for (const { route } of routes) {
      assert.equal(route?.stack[0]?.handle, refusal, String(route?.path));
    }
  });

  it('would notice a route, a router or a layer that did neither', function () {
    // Made by the module the routes file loaded, so this test knows it as that module does
    const authenticates = require(`${core}/server/auth/app-token`).createAppTokenAuthentication({});
    const router = express.Router('test');
    router.get('/open', handler);
    router.route('/chained').get(authenticates).post(handler);
    router.use('/child', express.Router('child'));
    router.use('/terminal', handler);
    router.use(handler);

    assert.deepEqual(problems(router, 'test'), [
      'test: GET /open',
      'test: POST /chained',
      'test: a router mounted at /^\\/child\\/?(?=\\/|$)/i',
      'test: a layer mounted at /^\\/terminal\\/?(?=\\/|$)/i',
      'test: a layer mounted at /^\\/?(?=\\/|$)/i',
    ]);
  });

  it('refuses an app token on every route that doesn’t authenticate it first', function () {
    const routes = adminApiRoutes();
    const access = new Map(routes.map(({ route, handlers }) => [route, appTokenAccess(handlers)]));

    assert.deepEqual(
      [...access].filter(([, each]) => each === 'unguarded'),
      [],
    );
    // Nobody is authenticated on these, or a rate limiter runs ahead of authentication
    for (const route of [
      'POST /session',
      'PUT /session/verify',
      'POST /authentication/password_reset',
      'POST /authentication/setup',
      'PUT /schedules/:resource/:id',
      'POST /email_previews/posts/:id',
      'GET /upgrades',
    ]) {
      assert.equal(access.get(route), 'refused', route);
    }
    // The legacy engine authenticates no app token, so there every route refuses one
    const expected = auth.isBetterAuth ? 'open' : 'refused';
    for (const route of ['GET /posts', 'GET /site', 'GET /apps/installations/:id']) {
      assert.equal(access.get(route), expected, route);
    }
  });

  // A route open to app tokens that asks for no staff user is reached by every app
  it('opens a route that authorizes nobody only for a method any app may call', function () {
    const open = adminApiRoutes().filter(({ handlers }) => appTokenAccess(handlers) === 'open');
    assert.equal(open.length > 0, auth.isBetterAuth);

    const authorizes = (handlers: unknown[]) => handlers.includes(auth.authorize.authorizeAdminApi);
    const forAnyone = open.filter(({ handlers }) => !authorizes(handlers));
    assert.equal(forAnyone.length > 0, auth.isBetterAuth);
    for (const { route, mounts } of forAnyone) {
      assert.ok(mounts && APP_UNCHECKED_ALLOWLIST.has(mounts), route);
    }
    // And one that ends outside the pipeline, which refuses apps where nothing is checked,
    // runs the Admin API's early refusal, which refuses them there
    assert.ok(refuseAppEarly);
    for (const { route, mounts, handlers } of open) {
      assert.ok(mounts || handlers.includes(refuseAppEarly), route);
    }
  });
});
