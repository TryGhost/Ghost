import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Frame } from '@tryghost/api-framework';

// Use the CommonJS instances reached by the real service roots and controllers.
const { pipeline } = require('@tryghost/api-framework');
const config = require('../../../../../core/shared/config');
const sentry = require('../../../../../core/shared/sentry');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const models = require('../../../../../core/server/models');
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');
const apiUtils = require('../../../../../core/server/api/endpoints/utils');
const events = require('../../../../../core/server/lib/common/events');

const modulePaths = [
  '../../../../../core/server/services/tags-public',
  '../../../../../core/server/services/tags-public/service',
  '../../../../../core/server/services/posts-public',
  '../../../../../core/server/services/posts-public/service',
  '../../../../../core/server/api/endpoints/tags-public',
  '../../../../../core/server/api/endpoints/posts-public',
  '../../../../../core/server/api/endpoints/pages-public',
].map((path) => require.resolve(path));

const cachedEndpoints = [
  ['tags', 'browse'],
  ['posts', 'browse'],
  ['posts', 'read'],
] as const;

describe('Public response cache service wiring', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeModule | undefined>;
  let previousListeners: Array<(...args: unknown[]) => void>;

  beforeEach(function () {
    // Independent configuration cases need fresh roots AND consumers: the
    // roots initialize once, and controllers capture their cache on import.
    // Keep these same instances for all requests and invalidation in a test.
    previousModules = new Map(modulePaths.map((path) => [path, require.cache[path]]));
    previousListeners = events.listeners('site.changed');
    for (const path of modulePaths) {
      delete require.cache[path];
    }
    sandbox.stub(sentry);
  });

  afterEach(function () {
    sandbox.restore();
    // Preserve the shared emitter and pre-existing subscribers. Transitive
    // imports may retain it, so replacing its module would leak an orphan copy.
    for (const listener of events.listeners('site.changed')) {
      if (!previousListeners.includes(listener)) {
        events.removeListener('site.changed', listener);
      }
    }
    for (const [path, previous] of previousModules) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  async function setup(
    enabled: boolean | { tags: boolean; posts: boolean },
    resource: 'tags' | 'posts' | 'pages',
    method: 'browse' | 'read',
  ) {
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig
      .withArgs('hostSettings:tagsPublicCache:enabled')
      .returns(typeof enabled === 'boolean' ? enabled : enabled.tags);
    getConfig
      .withArgs('hostSettings:postsPublicCache:enabled')
      .returns(typeof enabled === 'boolean' ? enabled : enabled.posts);
    const caches = { tags: new MemoryCache(), posts: new MemoryCache() };
    const getAdapter = sandbox.stub(adapterManager, 'getAdapter');
    getAdapter.withArgs('cache:tagsPublic').returns(caches.tags);
    getAdapter.withArgs('cache:postsPublic').returns(caches.posts);
    const tagsService = require('../../../../../core/server/services/tags-public');
    const postsService = require('../../../../../core/server/services/posts-public');
    await tagsService.init();
    await postsService.init();

    // Production boot initializes both roots before the endpoint modules
    // capture them. Do not fabricate a root export or replace endpoint.cache.
    const endpoints = {
      tags: require('../../../../../core/server/api/endpoints/tags-public'),
      posts: require('../../../../../core/server/api/endpoints/posts-public'),
      pages: require('../../../../../core/server/api/endpoints/pages-public'),
    };
    const query = sandbox.stub(
      resource === 'tags' ? models.TagPublic : models.Post,
      method === 'browse' ? 'findPage' : 'findOne',
    );
    let revision = 1;
    query.callsFake(async () => {
      const record = { id: '0123456789abcdef01234567', slug: 'cached-entry', revision };
      return method === 'browse' ? { data: [record] } : record;
    });
    const api = pipeline(
      endpoints[resource],
      {
        permissions: apiUtils.permissions,
        validators: apiUtils.validators,
        serializers: {
          input: apiUtils.serializers.input,
          // The database result and presentation are controlled here;
          // HTTP acceptance tests cover Ghost's full serialization.
          output: {
            default: {
              all(response: { data?: unknown[] }, _config: unknown, frame: Frame) {
                frame.response = { [resource]: response.data || [response] };
              },
            },
          },
        },
      },
      'content',
    );

    return {
      query,
      getAdapter,
      caches,
      tagsService,
      postsService,
      update() {
        revision += 1;
      },
      request(options = {}) {
        return api[method]({ slug: 'cached-entry', fields: 'id,slug', ...options });
      },
    };
  }

  for (const [resource, method] of cachedEndpoints) {
    it(`${resource} ${method} uses its own cache flag and refreshes after site.changed`, async function () {
      const { request, query, update, tagsService, postsService, getAdapter } = await setup(
        { tags: resource === 'tags', posts: resource === 'posts' },
        resource,
        method,
      );
      const first = await request();
      assert.equal(first[resource][0].revision, 1);
      sinon.assert.calledOnce(query);

      update();
      assert.deepEqual(await request(), first);
      sinon.assert.calledOnce(query);

      const changedOptions = await request({ fields: 'slug' });
      assert.equal(changedOptions[resource][0].revision, 2);
      sinon.assert.calledTwice(query);
      assert.deepEqual(await request(), first);

      await tagsService.init();
      await postsService.init();
      sinon.assert.calledOnceWithExactly(getAdapter, `cache:${resource}Public`);
      assert.equal(events.listenerCount('site.changed'), previousListeners.length + 1);
      assert.deepEqual(await request(), first);
      sinon.assert.calledTwice(query);

      events.emit('site.changed');
      const refreshed = await request();
      assert.equal(refreshed[resource][0].revision, 2);
      sinon.assert.calledThrice(query);
      assert.deepEqual(await request(), refreshed);
      sinon.assert.calledThrice(query);
    });

    it(`${resource} ${method} queries on every request when caching is disabled`, async function () {
      const { request, query, getAdapter, update } = await setup(false, resource, method);
      assert.equal((await request())[resource][0].revision, 1);
      update();
      assert.equal((await request())[resource][0].revision, 2);
      sinon.assert.calledTwice(query);
      sinon.assert.notCalled(getAdapter);
      assert.equal(events.listenerCount('site.changed'), previousListeners.length);
    });
  }

  for (const [resource, method] of [
    ['tags', 'read'],
    ['pages', 'browse'],
    ['pages', 'read'],
  ] as const) {
    it(`${resource} ${method} remains uncached when public caches are enabled`, async function () {
      const { request, query, caches, update } = await setup(true, resource, method);
      assert.equal((await request())[resource][0].revision, 1);
      update();
      assert.equal((await request())[resource][0].revision, 2);
      sinon.assert.calledTwice(query);
      assert.deepEqual(caches.tags.keys(), []);
      assert.deepEqual(caches.posts.keys(), []);
    });
  }
});
