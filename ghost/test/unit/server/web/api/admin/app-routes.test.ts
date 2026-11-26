import assert from 'node:assert/strict';

import { APP_PERMISSION_KEYS, isAppPermissionKey } from '@tryghost/app-contracts';
import { APP_ROUTES, checkAdminApiRequest } from '@tryghost/app-contracts/bridge';

import { adminApiRouter, adminApiRoutes, examplePath } from '../../../../../utils/admin-api-routes';

const ROUTES: Record<string, Record<string, readonly string[]>> = APP_ROUTES;

// Ghost's server is the gate on what an app may call: a scope opens every route that takes an
// app's token and whose permission check is the scope's key. A route that refuses an app's token
// before anything else, such as one with a rate limiter ahead of authentication, opens to no
// app. The app contracts hold the reviewed list of the routes each scope opens, with what
// Admin's bridge still covers on each, so that list has to be exactly the routes Ghost opens.
describe('The routes an app’s scopes open', function () {
  const routes = adminApiRoutes();
  // Whether a route starts with one of the Admin API's authentication chains, which take an
  // app's token on the Better Auth engine. Read from what follows the token's first handling
  // rather than from the handling itself, as the legacy engine refuses an app's token on every
  // route: there the refusal is followed by the chain, here by whatever runs ahead of it.
  const core = '../../../../../../core';
  const { authenticatesAppTokens, refuseUnauthenticatedAppToken: refusal } = require(
    `${core}/server/auth/app-token`,
  );
  const mw = require(`${core}/server/web/api/endpoints/admin/middleware`);
  const chainStarts = new Set(
    [mw.authAdminApi, mw.publicAdminApi].map((chain) => chain.flat(Infinity)[0]),
  );
  const takesAppTokens = (handlers: unknown[]) => {
    const first = handlers.findIndex(
      (handler) => handler === refusal || authenticatesAppTokens(handler),
    );
    return authenticatesAppTokens(handlers[first]) || chainStarts.has(handlers[first + 1]);
  };

  for (const scope of APP_PERMISSION_KEYS) {
    it(`opens exactly the reviewed routes for ${scope}`, function () {
      const opened = routes
        .filter(
          ({ permissionKey, handlers }) => permissionKey === scope && takesAppTokens(handlers),
        )
        .map(({ route }) => route)
        .sort();

      assert.deepEqual(
        opened,
        Object.keys(ROUTES[scope] ?? {}).sort(),
        `The routes Ghost opens to an app approved for ${scope} aren't the ones APP_ROUTES lists in contracts/app-contracts/src/bridge/app-routes.ts. Review the change as the comment there says before updating the list: a route apps shouldn't reach gets a permission key of its own, and one they should needs its server gaps named, or none.`,
      );
    });
  }

  // The bridge reads `:id` as any one segment, so a route Ghost mounts ahead of a listed `:id`
  // route, such as `GET /posts/export`, reaches the bridge as the listed route, and gets its
  // gaps. Each such route is named here, and the server refuses it to every app, as its key is no
  // scope; a change to its key, or a new route like it, fails here until it is reviewed.
  it('leaves no other route read as a listed one, but those the server refuses to apps', function () {
    const listed = Object.values(ROUTES).flatMap((opened) => Object.keys(opened));
    const segments = (path: string) => path.split('/').filter(Boolean);
    const readAs = (route: string, entry: string) => {
      const [method = '', path = ''] = route.split(' ');
      const [listedMethod = '', listedPath = ''] = entry.split(' ');
      const example = segments(examplePath(path));
      const pattern = segments(listedPath);
      return (
        method === listedMethod &&
        example.length === pattern.length &&
        pattern.every(
          (fixed, index) =>
            fixed.startsWith(':') || fixed.toLowerCase() === example[index]?.toLowerCase(),
        )
      );
    };
    const reachedAsListed = routes
      .filter(({ route, handlers }) => !listed.includes(route) && takesAppTokens(handlers))
      .filter(({ route }) => listed.some((entry) => readAs(route, entry)));

    assert.deepEqual(reachedAsListed.map(({ route }) => route).sort(), ['GET /posts/export']);
    for (const { route, permissionKey } of reachedAsListed) {
      assert.ok(
        permissionKey !== null && !isAppPermissionKey(permissionKey),
        `${route} reaches the bridge as a route it lists, and Ghost's server lets an app approved for ${permissionKey} call it`,
      );
    }
  });

  it('lists routes for no key that isn’t a scope', function () {
    assert.deepEqual(Object.keys(ROUTES).sort(), [...APP_PERMISSION_KEYS].sort());
  });

  // The bridge finds a route's gaps by matching the path itself, so it must read a path as
  // Ghost's router does.
  describe('are matched by the bridge as Ghost’s router matches them', function () {
    const layers = adminApiRouter().stack;
    const root = new URL('https://site.example/ghost/api/admin/');

    for (const [entry, gaps] of Object.values(ROUTES).flatMap((opened) => Object.entries(opened))) {
      it(`${entry} is the route Ghost’s router picks, and the bridge applies its gaps`, function () {
        const [method = '', path = ''] = entry.split(' ');
        const example = examplePath(path);
        const route = layers.find(
          (layer) => layer.route?.methods[method.toLowerCase()] && layer.match(example),
        )?.route;
        assert.ok(route, `${method} ${example} matches no route the Admin API mounts`);
        // The parameter names may differ, but the shape must be the same.
        assert.equal(
          String(route.path).replace(/:[a-z_]+/gi, ':'),
          path.replace(/:[a-z]+/g, ':'),
          `${entry} is routed by ${method} ${String(route.path)}`,
        );

        const check = checkAdminApiRequest(
          { path: `${example}/`, method: method as 'GET' },
          root,
          new Set(APP_PERMISSION_KEYS),
        );
        if (check.problem === 'blocked') {
          // A gap that refuses the route whole
          assert.ok(check.gap && gaps.includes(check.gap), `${entry} was refused by ${check.gap}`);
        } else {
          assert.deepEqual(check.problem === undefined && [...check.gaps].sort(), [...gaps].sort());
        }
      });
    }
  });
});
