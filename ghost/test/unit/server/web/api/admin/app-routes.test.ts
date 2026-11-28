import assert from 'node:assert/strict';

import { APP_PERMISSION_KEYS, isAppPermissionKey } from '@tryghost/app-contracts';
import { APP_ROUTES, checkAdminApiRequest, scopesOpening } from '@tryghost/app-contracts/bridge';

import { adminApiRouter, adminApiRoutes, examplePath } from '../../../../../utils/admin-api-routes';

const ROUTES: Record<string, Record<string, readonly string[]>> = APP_ROUTES;

// On Ghost's server a scope opens every route whose permission check is the scope's key. The
// app contracts hold the reviewed list of those routes, with what Admin's bridge still covers on
// each, so that list has to be exactly the routes Ghost opens.
describe('The routes an app’s scopes open', function () {
  const routes = adminApiRoutes();

  for (const scope of APP_PERMISSION_KEYS) {
    it(`opens exactly the reviewed routes for ${scope}`, function () {
      const opened = routes
        .filter(({ permissionKey }) => permissionKey === scope)
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
  // route, such as `GET /posts/export`, reaches the bridge as the listed route. Each such route
  // is named here, and the server refuses it to every app, as its key is no scope; a change to
  // its key, or a new route like it, fails here until it is reviewed.
  it('leaves no other route reached as a listed one, but those the server refuses to apps', function () {
    const listed = new Set(Object.values(ROUTES).flatMap((opened) => Object.keys(opened)));
    const reachedAsListed = routes
      .filter(({ route }) => !listed.has(route))
      .filter(({ route }) => {
        const [method = '', path = ''] = route.split(' ');
        return scopesOpening(`${examplePath(path)}/`, method as 'GET').length > 0;
      });

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
