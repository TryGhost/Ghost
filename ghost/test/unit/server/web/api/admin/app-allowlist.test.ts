import assert from 'node:assert/strict';

import { ADMIN_API_ALLOWLIST } from '@tryghost/app-contracts/bridge';
import type { Router } from 'express';

import apiRoutes from '../../../../../../core/server/web/api/endpoints/admin/routes';

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
  match(path: string): boolean;
}

// A path that fills each of a route's parameters with a value it accepts: an object ID for
// `:id`, a word for anything else.
const examplePath = (path: string) =>
  path.replace(/:id\b/g, '5ddc9141c35e7700383b2937').replace(/:[a-z]+/g, 'example');

// Apps reach the Admin API through Admin's bridge, which only allows the routes in the app
// contracts' allowlist. Each one must be a route Ghost has, so a renamed or removed route
// can't leave the allowlist naming something else.
describe('the app bridge allowlist', function () {
  const layers = (apiRoutes() as Router).stack as unknown as RouteLayer[];

  for (const scope of ADMIN_API_ALLOWLIST) {
    for (const entry of scope.routes) {
      it(`matches a registered route: ${entry} (${scope.name})`, function () {
        const [method = '', path = ''] = entry.split(' ');
        const example = examplePath(path);
        const route = layers.find(
          (layer) => layer.route?.methods[method.toLowerCase()] && layer.match(example),
        )?.route;
        assert.ok(route, `${method} ${example} matches no route in routes.js`);
        // The parameter names may differ, but the shape must be the same.
        assert.equal(
          route.path.replace(/:[a-z_]+/gi, ':'),
          path.replace(/:[a-z]+/g, ':'),
          `${entry} is routed by ${method} ${route.path}`,
        );
      });
    }
  }
});
