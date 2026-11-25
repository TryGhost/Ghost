import assert from 'node:assert/strict';
import errors from '@tryghost/errors';

const permissions = require('../../../../../../core/server/api/endpoints/utils/permissions');
const routes = require('../../../../../../core/server/web/api/endpoints/admin/routes');
// Required, not imported, so it is the copy the routes registered their handlers with
const { routedMethod } = require('@tryghost/api-framework');

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
  'members_metafields.add',
  'members_metafields.browse',
  'members_metafields.destroy',
  'members_metafields.edit',
  'members_metafields.read',
  'members_metafields.reorder',
  'oembed.read',
  'presence.leave',
  'presence.poll',
  'schedules.publish',
  // Mounted without authentication, so no app reaches it
  'site.read',
  'slack.sendTest',
  'users.readStaffToken',
  'users.regenerateStaffToken',
  'users.transferOwnership',
];

/**
 * Routes ending in a controller outside the API pipeline, whose permission stage never sees them,
 * by method and path
 */
const OUTSIDE_PIPELINE = [
  // Only DELETE /session authenticates, and its route refuses apps
  'DELETE /session',
  'POST /session',
  'POST /session/verify',
  'PUT /session/verify',
];

/**
 * Routes that end in no controller: each authenticates the requests to a router mounted after
 * it, whose routes run nothing before their controller
 */
const AUTHENTICATING_MOUNTS = [
  'ALL /apps,/apps/*',
  'ALL /members/metafields,/members/metafields/*',
];

/** Routes whose `http()` wraps a method the API doesn't have, so they answer only errors */
const MOUNTING_NOTHING = ['GET /config/featurebase'];

/** Middleware the routers run on every request, which acts for no one */
const ROUTER_MIDDLEWARE = ['corsCaching', 'corsMiddleware', 'expressNoop', 'labsEnabledMw'];

type AdminApiMethod = {
  /** By its controller's `docName`, as the permission stage and the allowlist name it */
  name: string;
  impl: { permissions?: unknown };
};

type MountedRoutes = {
  /** Every pipeline method a route ends in, once per method */
  methods: AdminApiMethod[];
  /** Routes ending in a controller outside the pipeline */
  outside: string[];
  /** Routes ending in no controller */
  unrouted: string[];
  /** Routes ending in `http()` of a method that doesn't exist */
  empty: string[];
  /** Routes in a mounted router that run anything before their controller */
  guardedLate: string[];
  /** Other middleware the routers run, by name */
  middleware: string[];
};

/**
 * Everything the Admin API router mounts, walked from the router itself rather than read from
 * the routes file, so a route mounted in any form is found
 */
function mountedRoutes(): MountedRoutes {
  const found: MountedRoutes = {
    methods: [],
    outside: [],
    unrouted: [],
    empty: [],
    guardedLate: [],
    middleware: [],
  };
  const methods = new Map<unknown, AdminApiMethod>();

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
      const verbs = Object.keys(layer.route.methods).map((verb) =>
        verb === '_all' ? 'ALL' : verb.toUpperCase(),
      );
      const route = `${verbs.join(',')} ${[layer.route.path].flat().join(',')}`;
      const handlers = layer.route.stack.map((l: { handle: unknown }) => l.handle);
      const routed = routedMethod(handlers.at(-1));
      if (!routed) {
        // A handler from http() whose method is undefined
        found[handlers.at(-1).name === 'Http' ? 'empty' : 'unrouted'].push(route);
        continue;
      }
      // Authenticated by the route the router is mounted after, whose refusal can't see the method
      if (mounted && handlers.length > 1) {
        found.guardedLate.push(route);
      }
      if (!routed.docName) {
        found.outside.push(route);
        continue;
      }
      methods.set(routed.controller, {
        name: `${routed.docName}.${routed.method}`,
        impl: { permissions: routed.permissions },
      });
    }
  };
  walk(routes(), false);

  found.methods = [...methods.values()];
  return found;
}

const isUnchecked = ({ impl }: AdminApiMethod) =>
  impl.permissions === false || typeof impl.permissions === 'function';

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
    const { outside, unrouted, empty, guardedLate, middleware } = mountedRoutes();

    assert.deepEqual(outside.sort(), [...OUTSIDE_PIPELINE].sort());
    assert.deepEqual(unrouted.sort(), [...AUTHENTICATING_MOUNTS].sort());
    assert.deepEqual(empty, MOUNTING_NOTHING);
    // Refusing an app before a route's own middleware needs the route to name its method
    assert.deepEqual(guardedLate, []);
    assert.deepEqual([...new Set(middleware)].sort(), ROUTER_MIDDLEWARE);
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
