import assert from 'node:assert/strict';
import { definitionKind } from '../../../../../core/kernel/domains/definitions';

const routes = require('../../../http/routes').default;

type Route = {
  surface: string;
  method: string;
  path: string;
  middleware: string[];
  handler: string;
};

describe('network routes', function () {
  it('declares the same routes, middleware and handlers the central route files held', function () {
    assert.equal(definitionKind(routes), 'routes');
    assert.deepEqual(
      routes.routes.map(
        ({ surface, method, path, middleware, handler }: Route) =>
          `${surface} ${method.toUpperCase()} ${path} [${middleware.join(',')}] ${handler}`,
      ),
      [
        'admin GET /recommendations [authAdminApi] recommendations.endpoint#browse',
        'admin GET /recommendations/:id [authAdminApi] recommendations.endpoint#read',
        'admin POST /recommendations [authAdminApi] recommendations.endpoint#add',
        'admin POST /recommendations/check [authAdminApi] recommendations.endpoint#check',
        'admin PUT /recommendations/:id [authAdminApi] recommendations.endpoint#edit',
        'admin DELETE /recommendations/:id [authAdminApi] recommendations.endpoint#destroy',
        'admin GET /incoming_recommendations [authAdminApi] incoming-recommendations.endpoint#browse',
        'content GET /recommendations [authenticatePublic] recommendations-public.endpoint#browse',
        'members POST /api/recommendations/:id/clicked [loadMemberSession] recommendations-public.endpoint#trackClicked',
        'members POST /api/recommendations/:id/subscribed [loadMemberSession] recommendations-public.endpoint#trackSubscribed',
      ],
    );
  });

  it('names only handlers that exist', function () {
    for (const { handler } of routes.routes as Route[]) {
      const [file, member] = handler.split('#');
      const endpoint = require(`../../../http/${file}`).default;
      assert.equal(typeof endpoint[member!]?.query, 'function', handler);
    }
  });
});
