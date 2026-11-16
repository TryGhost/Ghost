import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import sinon from 'sinon';

const {
  mountDomainRoutes,
}: typeof import('../../../../../core/server/web/api/mount-domain-routes') = require('../../../../../core/server/web/api/mount-domain-routes');

// The web layer mounts what the domains declare. These tests use the real
// ghost/domains folder and a router that records what is mounted on it.
function recordingRouter() {
  const mounted: { method: string; path: string; handlers: unknown[] }[] = [];
  const record =
    (method: string) =>
    (path: string, ...handlers: unknown[]) =>
      mounted.push({ method, path, handlers });
  return {
    mounted,
    router: {
      get: record('get'),
      post: record('post'),
      put: record('put'),
      patch: record('patch'),
      delete: record('delete'),
    } as unknown as Parameters<typeof mountDomainRoutes>[0],
  };
}

describe('mountDomainRoutes', function () {
  it('mounts each route of the surface with its named middleware before a handler', function () {
    const authAdminApi = sinon.stub();
    const { router, mounted } = recordingRouter();

    mountDomainRoutes(router, { surface: 'admin', middleware: { authAdminApi } });

    const browse = mounted.find(
      ({ method, path }) => method === 'get' && path === '/recommendations',
    );
    assert.ok(browse, 'The network domain declares GET /recommendations for the admin surface');
    assert.equal(browse.handlers.length, 2);
    assert.equal(browse.handlers[0], authAdminApi);
    assert.equal(typeof browse.handlers[1], 'function');
    // Mounting calls no middleware and no handler.
    sinon.assert.notCalled(authAdminApi);
    assert.ok(
      mounted.every(({ path }) => !path.startsWith('/api/')),
      'No members route is mounted',
    );
  });

  it('spreads a middleware stack given as a list', function () {
    const first = sinon.stub();
    const second = sinon.stub();
    const { router, mounted } = recordingRouter();

    mountDomainRoutes(router, {
      surface: 'content',
      middleware: { authenticatePublic: [first, second] },
      apiType: 'content',
    });

    const [route] = mounted;
    assert.ok(route);
    assert.deepEqual(route.handlers.slice(0, 2), [first, second]);
  });

  it('refuses a route that names middleware the surface does not have', function () {
    const { router } = recordingRouter();

    assert.throws(
      () => mountDomainRoutes(router, { surface: 'admin', middleware: {} }),
      (error: unknown) =>
        error instanceof IncorrectUsageError &&
        /names the middleware authAdminApi, which the admin surface does not have/.test(
          error.message,
        ),
    );
  });

  it('mounts nothing for a surface no domain declares routes for', function () {
    const { router, mounted } = recordingRouter();
    mountDomainRoutes(router, { surface: 'nowhere', middleware: {} });
    assert.deepEqual(mounted, []);
  });
});
