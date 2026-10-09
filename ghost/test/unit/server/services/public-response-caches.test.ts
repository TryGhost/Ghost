import assert from 'node:assert/strict';
import sinon from 'sinon';

// Use the CommonJS instances reached by the real service roots and controllers.
const config = require('../../../../core/shared/config');
const adapterManager = require('../../../../core/server/services/adapter-manager').default;
const events = require('../../../../core/server/lib/common/events');
const MemoryCache = require('../../../../core/server/adapters/cache/MemoryCache');

const services = {
  tags: require('../../../../core/server/services/tags-public'),
  posts: require('../../../../core/server/services/posts-public'),
};

const endpointPaths = {
  tags: require.resolve('../../../../core/server/api/endpoints/tags-public'),
  posts: require.resolve('../../../../core/server/api/endpoints/posts-public'),
  pages: require.resolve('../../../../core/server/api/endpoints/pages-public'),
};

type Resource = keyof typeof services;
const resources: Resource[] = ['tags', 'posts'];

// How the API pipeline uses an endpoint's `cache` is covered in
// packages/api-framework, and the behaviour over HTTP in
// test/e2e-server/public-response-caches.isolated.test.ts. This file covers
// the wiring between them: flag -> service root -> endpoint binding.
describe('Public response caches', function () {
  const sandbox = sinon.createSandbox();
  let previousApis: Record<Resource, unknown>;
  let previousEndpoints: Map<string, NodeModule | undefined>;
  let previousListeners: Array<(...args: unknown[]) => void>;
  let caches: Record<Resource, InstanceType<typeof MemoryCache>>;
  let getAdapter: sinon.SinonStub;

  beforeEach(function () {
    previousApis = { tags: services.tags.api, posts: services.posts.api };
    previousEndpoints = new Map(
      Object.values(endpointPaths).map((path) => [path, require.cache[path]]),
    );
    previousListeners = events.rawListeners('site.changed');

    // The roots initialize once; clear them so each test sees a first init.
    services.tags.api = undefined;
    services.posts.api = undefined;

    caches = { tags: new MemoryCache(), posts: new MemoryCache() };
    getAdapter = sandbox.stub(adapterManager, 'getAdapter');
    getAdapter.withArgs('cache:tagsPublic').returns(caches.tags);
    getAdapter.withArgs('cache:postsPublic').returns(caches.posts);
  });

  afterEach(function () {
    sandbox.restore();
    services.tags.api = previousApis.tags;
    services.posts.api = previousApis.posts;
    for (const listener of events.rawListeners('site.changed')) {
      if (!previousListeners.includes(listener)) {
        events.removeListener('site.changed', listener);
      }
    }
    for (const [path, previous] of previousEndpoints) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  function setFlags(flags: Record<Resource, boolean>) {
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:tagsPublicCache:enabled').returns(flags.tags);
    getConfig.withArgs('hostSettings:postsPublicCache:enabled').returns(flags.posts);
  }

  for (const resource of resources) {
    const other: Resource = resource === 'tags' ? 'posts' : 'tags';

    describe(`${resource}-public service`, function () {
      // The other flag is always set to the opposite value, so reading the
      // wrong flag fails both cases.
      it('uses its own adapter when its flag is enabled', async function () {
        setFlags({ [resource]: true, [other]: false } as Record<Resource, boolean>);

        await services[resource].init();

        assert.equal(services[resource].api.cache, caches[resource]);
        sinon.assert.calledOnceWithExactly(getAdapter, `cache:${resource}Public`);
      });

      it('has no cache when its flag is disabled', async function () {
        setFlags({ [resource]: false, [other]: true } as Record<Resource, boolean>);

        await services[resource].init();

        assert.equal(services[resource].api.cache, undefined);
        sinon.assert.notCalled(getAdapter);
        assert.equal(events.listenerCount('site.changed'), previousListeners.length);
      });

      it('resets its cache on site.changed', async function () {
        setFlags({ tags: true, posts: true });
        await services[resource].init();
        caches[resource].set('key', 'value');

        // Exercise only the listener registered by this init. Broadcasting on
        // the shared emitter would also clear caches owned by other tests.
        // Actual event dispatch is covered by the isolated HTTP tests.
        const listeners = events
          .rawListeners('site.changed')
          .filter(
            (listener: (...args: unknown[]) => void) => !previousListeners.includes(listener),
          );
        assert.equal(listeners.length, 1);
        listeners[0].call(events);

        assert.deepEqual(caches[resource].keys(), []);
      });

      it('initializes only once', async function () {
        setFlags({ tags: true, posts: true });

        await services[resource].init();
        const cache = services[resource].api.cache;
        cache.set('key', 'value');

        await services[resource].init();

        assert.equal(services[resource].api.cache, cache);
        assert.equal(cache.get('key'), 'value');
        sinon.assert.calledOnce(getAdapter);
        assert.equal(events.listenerCount('site.changed'), previousListeners.length + 1);
      });
    });
  }

  describe('endpoint bindings', function () {
    for (const enabled of [true, false]) {
      it(`binds only enabled caches to their endpoints (enabled: ${enabled})`, async function () {
        setFlags({ tags: enabled, posts: enabled });
        await services.tags.init();
        await services.posts.init();

        // Endpoints read `service.api.cache` when they load, as they do after
        // boot has initialized the roots.
        for (const path of Object.values(endpointPaths)) {
          delete require.cache[path];
        }
        const tags = require(endpointPaths.tags);
        const posts = require(endpointPaths.posts);
        const pages = require(endpointPaths.pages);

        assert.equal(tags.browse.cache, enabled ? caches.tags : undefined);
        assert.equal(posts.browse.cache, enabled ? caches.posts : undefined);
        assert.equal(posts.read.cache, enabled ? caches.posts : undefined);

        assert.equal(tags.read.cache, undefined);
        assert.equal(pages.browse.cache, undefined);
        assert.equal(pages.read.cache, undefined);
      });
    }
  });
});
