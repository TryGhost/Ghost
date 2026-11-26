import assert from 'node:assert/strict';
import errors from '@tryghost/errors';

const permissions = require('../../../../../../core/server/api/endpoints/utils/permissions');
const routes = require('../../../../../../core/server/web/api/endpoints/admin/routes');
const {
  authAdminApi,
  routeHandlers,
} = require('../../../../../../core/server/web/api/endpoints/admin/middleware');
// Required, not imported, so it is the copy the routes registered their handlers with
const { http, pipeline, routedMethod } = require('@tryghost/api-framework');
const express = require('express');

/**
 * Admin API methods whose permission check is their own or none, which refuse apps, by their
 * controller's `docName`. A new one fails the test below until it is added here
 * or, only if it is safe for any app whatever its scopes, to the allowlist in
 * `api/endpoints/utils/permissions.js`.
 */
const REFUSED_FOR_APPS = [
  'authentication.acceptInvitation',
  'authentication.isInvitation',
  'authentication.isSetup',
  'authentication.resetPassword',
  'authentication.setup',
  'authentication.updateSetup',
  'config.read',
  'featurebase.token',
  'files.upload',
  'gift_links.browse',
  'gift_links.create',
  'gift_links.ensure',
  'gift_links.removeAll',
  'images.upload',
  'media.upload',
  'media.uploadThumbnail',
  'members_metafields.browse',
  'members_metafields.read',
  'oembed.read',
  'presence.leave',
  'presence.poll',
  'schedules.publish',
  // All but session.delete are mounted without authentication, so no app reaches them
  'session.add',
  'session.delete',
  'session.sendVerification',
  'session.verify',
  'site.read',
  'slack.sendTest',
  'users.readStaffToken',
  'users.regenerateStaffToken',
  'users.transferOwnership',
];

/**
 * Routes that end in no controller: each authenticates the requests to a router mounted after
 * it, whose routes run nothing before their controller
 */
const AUTHENTICATING_MOUNTS = [
  'ALL /apps,/apps/*',
  'ALL /members/metafields,/members/metafields/*',
];

/** Middleware the routers run on every request, which acts for no one */
const ROUTER_MIDDLEWARE = ['corsCaching', 'corsMiddleware', 'expressNoop', 'labsEnabledMw'];

type AdminApiMethod = {
  /** By its controller's `docName`, as the permission stage and the allowlist name it */
  name: string;
  impl: { permissions?: unknown };
};

const isUnchecked = ({ impl }: AdminApiMethod) =>
  impl.permissions === undefined ||
  impl.permissions === false ||
  typeof impl.permissions === 'function';

/** One verb of a route, as Express runs it */
type MountedRoute = {
  /** By verb and path */
  name: string;
  route: { stack: any[]; methods: Record<string, boolean> };
  /** The request method that reaches it */
  verb: string;
};

type MountedRoutes = {
  /** Every pipeline method a route ends in, once per method */
  methods: AdminApiMethod[];
  /** Routes ending in `http()` whose handler names no pipeline method */
  outside: MountedRoute[];
  /** Routes ending in `http()`, of either kind */
  controllers: MountedRoute[];
  /** Routes ending in a pipeline method that checks no standard permission */
  unchecked: MountedRoute[];
  /** Routes ending in no controller */
  unrouted: MountedRoute[];
  /** Routes in a mounted router that run anything before their controller */
  guardedLate: string[];
  /** Routes in a mounted router ending in `http()` whose handler names no pipeline method */
  outsideMounted: string[];
  /** Other middleware the routers run, by name */
  middleware: string[];
};

/**
 * Everything the Admin API router mounts, walked from the router itself rather than read from
 * the routes file, so a route mounted in any form is found
 */
function mountedRoutes(adminApi: { stack: any[] } = routes()): MountedRoutes {
  const found: MountedRoutes = {
    methods: [],
    outside: [],
    controllers: [],
    unchecked: [],
    unrouted: [],
    guardedLate: [],
    outsideMounted: [],
    middleware: [],
  };
  const methods = new Map<unknown, AdminApiMethod>();

  /** One verb of a route, by the handlers Express runs for it */
  const classify = (mountedRoute: MountedRoute, handlers: any[], mounted: boolean) => {
    const routed = routedMethod(handlers.at(-1));
    if (!routed) {
      found.unrouted.push(mountedRoute);
      return;
    }
    found.controllers.push(mountedRoute);
    // Authenticated by the route the router is mounted after, whose refusal can't see the method
    if (mounted && handlers.length > 1) {
      found.guardedLate.push(mountedRoute.name);
    }
    if (!routed.docName) {
      found.outside.push(mountedRoute);
      // Only the pipeline refuses an app on a mounted route
      if (mounted) {
        found.outsideMounted.push(mountedRoute.name);
      }
      return;
    }
    const method = {
      name: `${routed.docName}.${routed.method}`,
      impl: { permissions: routed.permissions },
    };
    methods.set(routed.controller, method);
    if (isUnchecked(method)) {
      found.unchecked.push(mountedRoute);
    }
  };

  const walk = (router: { stack: any[] }, mounted: boolean) => {
    for (const layer of router.stack) {
      if (!layer.route) {
        if (layer.handle.stack) {
          walk(layer.handle, true);
        } else {
          found.middleware.push(layer.handle.name);
        }
        continue;
      }
      const path = [layer.route.path].flat().join(',');
      // A route serving several verbs runs a different chain for each
      for (const method of Object.keys(layer.route.methods)) {
        const verb = method === '_all' ? 'GET' : method.toUpperCase();
        const name = `${method === '_all' ? 'ALL' : verb} ${path}`;
        classify(
          { name, route: layer.route, verb },
          routeHandlers(layer.route, method === '_all' ? 'get' : method),
          mounted,
        );
      }
    }
  };
  walk(adminApi, false);

  found.methods = [...methods.values()];
  return found;
}

const refuseAppEarly = authAdminApi.find(
  (handler: { name: string }) => handler.name === 'refuseAppEarly',
);

/** What the Admin API's early refusal does with a request to a route: the error, or none */
const refusalOf = (route: MountedRoute, auth: unknown) =>
  new Promise((resolve) => {
    refuseAppEarly({ auth, route: route.route, method: route.verb }, {}, resolve);
  });

/** Whether the route runs the Admin API's authentication, and the early refusal with it */
const authenticates = (route: MountedRoute) =>
  routeHandlers(route.route, route.verb).includes(refuseAppEarly);

describe('API permissions for apps', function () {
  const app = { kind: 'app' };
  const unchecked = () =>
    [
      ...new Set(
        mountedRoutes()
          .methods.filter(isUnchecked)
          .map(({ name }) => name),
      ),
    ].sort();

  it('knows every Admin API method that checks no standard permission', function () {
    const allowlisted = [...permissions.APP_UNCHECKED_ALLOWLIST];

    assert.deepEqual(unchecked(), [...REFUSED_FOR_APPS, ...allowlisted].sort());
  });

  it('can classify everything the Admin API mounts', function () {
    const { unrouted, guardedLate, outsideMounted, middleware } = mountedRoutes();

    assert.deepEqual(unrouted.map(({ name }) => name).sort(), [...AUTHENTICATING_MOUNTS].sort());
    // Refusing an app before a route's own middleware needs the route to name its method
    assert.deepEqual(guardedLate, []);
    assert.deepEqual(outsideMounted, []);
    assert.deepEqual([...new Set(middleware)].sort(), ROUTER_MIDDLEWARE);
  });

  describe('refusing an app before a route runs', function () {
    const staff = { kind: 'user' };

    it('refuses an app on every authenticated route ending in a controller outside the pipeline', async function () {
      const { outside } = mountedRoutes();

      for (const route of outside.filter(authenticates)) {
        assert.ok((await refusalOf(route, app)) instanceof errors.NoPermissionError, route.name);
      }
    });

    it('refuses an app on every authenticated route ending in a method it may not call unchecked', async function () {
      for (const route of mountedRoutes().unchecked.filter(authenticates)) {
        assert.ok((await refusalOf(route, app)) instanceof errors.NoPermissionError, route.name);
      }
    });

    it('lets an app through each route that authenticates a mounted router', async function () {
      for (const route of mountedRoutes().unrouted) {
        assert.equal(await refusalOf(route, app), undefined, route.name);
      }
    });

    it('leaves a staff user to every route', async function () {
      const { controllers, unrouted } = mountedRoutes();

      for (const route of [...controllers, ...unrouted].filter(authenticates)) {
        assert.equal(await refusalOf(route, staff), undefined, route.name);
      }
    });
  });

  describe('walking a router', function () {
    const controller = pipeline(
      {
        docName: 'things',
        browse: { permissions: false, query: () => ({}) },
        add: { permissions: true, query: () => ({}) },
        bare: () => ({}),
      },
      {},
    );

    it('classifies each verb of a route that serves several', function () {
      const router = express.Router();
      router.route('/things').get(http(controller.browse)).post(http(controller.add));

      const { methods } = mountedRoutes(router);

      assert.deepEqual(
        methods.filter(isUnchecked).map(({ name }) => name),
        ['things.browse'],
      );
      assert.deepEqual(methods.map(({ name }) => name).sort(), ['things.add', 'things.browse']);
    });

    it('counts a method written as a single function as checking no standard permission', function () {
      const router = express.Router();
      router.get('/things/bare', http(controller.bare));

      const { methods } = mountedRoutes(router);

      assert.deepEqual(
        methods.filter(isUnchecked).map(({ name }) => name),
        ['things.bare'],
      );
    });

    it('puts a route whose http() names no pipeline method outside the pipeline', function () {
      const router = express.Router();
      router.get(
        '/plain',
        http(() => ({})),
      );
      router.get('/missing', http(undefined));

      const { methods, outside } = mountedRoutes(router);

      assert.deepEqual(methods, []);
      assert.deepEqual(
        outside.map(({ name }) => name),
        ['GET /plain', 'GET /missing'],
      );
    });

    it('finds a mounted route outside the pipeline, which only the pipeline could refuse', function () {
      const router = express.Router();
      const mounted = express.Router();
      router.all(['/mounted', '/mounted/*'], ...authAdminApi);
      router.use('/mounted', mounted);
      mounted.get(
        '/plain',
        http(() => ({})),
      );

      assert.deepEqual(mountedRoutes(router).outsideMounted, ['GET /plain']);
    });
  });

  it('finds no unchecked method sharing its name with another', function () {
    const byName = Map.groupBy(mountedRoutes().methods, ({ name }) => name);
    const shared = [...byName]
      .filter(([, methods]) => methods.length > 1 && methods.some(isUnchecked))
      .map(([name]) => name);

    // An allowlist entry or refusal for the name would apply to every method with it
    assert.deepEqual(shared, []);
  });

  it('refuses an app on each', async function () {
    for (const name of REFUSED_FOR_APPS) {
      const [docName, method] = name.split('.');
      await assert.rejects(
        permissions.handleUnchecked(
          { docName, method },
          { options: { context: { principal: app } } },
        ),
        errors.NoPermissionError,
        name,
      );
    }
  });

  it('allows an app on a method on the allowlist', async function () {
    const call = () =>
      permissions.handleUnchecked(
        { docName: 'posts', method: 'browse' },
        { options: { context: { principal: app } } },
      );
    await assert.rejects(call(), errors.NoPermissionError);

    permissions.APP_UNCHECKED_ALLOWLIST.add('posts.browse');
    try {
      await call();
    } finally {
      permissions.APP_UNCHECKED_ALLOWLIST.delete('posts.browse');
    }
  });

  it('leaves every other principal to the method', async function () {
    for (const principal of [{ kind: 'user' }, { kind: 'integration' }, null, undefined]) {
      await permissions.handleUnchecked(
        { docName: 'authentication', method: 'updateSetup' },
        { options: { context: { principal } } },
      );
    }
    await permissions.handleUnchecked(
      { docName: 'authentication', method: 'updateSetup' },
      { options: {} },
    );
  });
});
