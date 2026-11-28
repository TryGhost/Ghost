import assert from 'node:assert/strict';
import type { RequestHandler } from 'express';

import { adminApiRoutes, mountPathOf, type MountedRouter } from '../../utils/admin-api-routes';

const express = require('../../../core/shared/express');
// Required, not imported, so it is the copy the utility reads a handler's method with
const { http, pipeline } = require('@tryghost/api-framework');

const named = (name: string): RequestHandler =>
  Object.defineProperty((_req: unknown, _res: unknown, next: () => void) => next(), 'name', {
    value: name,
  }) as RequestHandler;

// Tests of what apps can reach read the Admin API's routes from the router it mounts, so a
// route they can't read is a route they don't cover.
describe('Reading the routes a router mounts', function () {
  const api = pipeline(
    {
      docName: 'widgets',
      browse: { permissions: true, query: () => [] },
      read: { permissions: { docName: 'gadgets', method: 'inspect' }, query: () => ({}) },
      count: { permissions: false, query: () => 0 },
      check: { permissions: () => undefined, query: () => true },
    },
    {},
  );
  const [first, auth, limiter, flag] = ['first', 'auth', 'limiter', 'flag'].map(named);
  const raw = named('raw');

  function mounted() {
    const router = express.Router('test');
    router.use(first);
    router.get('/widgets', auth, http(api.browse));
    router.route('/widgets/:id').get(http(api.read)).put(limiter, raw);
    router.post(['/widgets/count/', '/widgets/total'], [auth, [limiter]], http(api.count));
    const child = express.Router('child');
    router.all(['/Nested.path', '/Nested.path/*'], auth);
    router.use('/Nested.path', child);
    child.get('/', http(api.check));
    child.use(flag);
    child.delete('/:id', http(api.browse));
    const routes = adminApiRoutes(router as MountedRouter);
    return { router: router as MountedRouter, routes, child };
  }

  const read = (routes: ReturnType<typeof adminApiRoutes>) =>
    Object.fromEntries(
      routes.map(({ route, mounts, permissionKey, handlers }) => [
        route,
        [mounts, permissionKey, handlers.map((handler) => (handler as { name: string }).name)],
      ]),
    );

  it('reads every route, however it was mounted, with what a request to it runs', function () {
    // Ghost's routers start with Sentry's error handler, which a request doesn't run
    const sentry = 'expressNoop';
    assert.deepEqual(read(mounted().routes), {
      'GET /widgets': ['widgets.browse', 'widget:browse', [sentry, 'first', 'auth', 'Http']],
      'GET /widgets/:id': ['widgets.read', 'gadget:inspect', [sentry, 'first', 'Http']],
      'PUT /widgets/:id': [null, null, [sentry, 'first', 'limiter', 'raw']],
      'POST /widgets/count': ['widgets.count', null, [sentry, 'first', 'auth', 'limiter', 'Http']],
      'POST /widgets/total': ['widgets.count', null, [sentry, 'first', 'auth', 'limiter', 'Http']],
      'GET /Nested.path': ['widgets.check', null, [sentry, 'first', 'auth', sentry, 'Http']],
      'DELETE /Nested.path/:id': [
        'widgets.browse',
        'widget:browse',
        [sentry, 'first', 'auth', sentry, 'flag', 'Http'],
      ],
    });
  });

  it('reads the path a router is mounted at', function () {
    const { router, child } = mounted();
    const layer = router.stack.find(({ handle }) => handle === child);
    assert.ok(layer);
    assert.equal(mountPathOf(layer), '/Nested.path');
    assert.equal(mountPathOf(router.stack[1]!), '');
  });

  it('reads the Admin API’s own router', function () {
    const routes = adminApiRoutes();
    const byRoute = read(routes);

    // Fewer than it mounts means the reading of it has broken
    assert.ok(routes.length > 250, `read only ${routes.length} routes`);
    assert.deepEqual(byRoute['GET /posts/:id']?.slice(0, 2), ['posts.read', 'post:read']);
    assert.deepEqual(byRoute['GET /apps/installations/:id']?.slice(0, 2), [
      'app_installations.read',
      'app_installation:read',
    ]);
    // The session controller's methods are single functions, which check no permission
    assert.deepEqual(byRoute['POST /session']?.slice(0, 2), ['session.add', null]);
    // A route on a router mounted under another runs the authentication mounted ahead of it
    assert.ok(
      (byRoute['GET /apps/installations/:id']?.[2] as string[]).includes('tokenPermissionCheck'),
    );
  });
});
