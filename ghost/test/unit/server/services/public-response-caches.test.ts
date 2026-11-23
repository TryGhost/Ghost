import assert from 'node:assert/strict';
import sinon from 'sinon';

// Use the CommonJS instances reached by the real service roots and controllers.
const config = require('../../../../core/shared/config');
const adapterManager = require('../../../../core/server/services/adapter-manager').default;
const events = require('../../../../core/server/lib/common/events');
const MemoryCache = require('../../../../core/server/adapters/cache/MemoryCache');
const {
  openServices,
  services: application,
}: typeof import('../../../utils/services') = require('../../../utils/services');

// The roots Ghost registers. A fresh copy would have to be registered too, and would then keep
// listening for the rest of the worker's tests.
const services = {
  tags: require('../../../../core/server/services/tags-public').default,
  posts: require('../../../../core/server/services/posts-public').default,
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
  let previousModules: Map<string, NodeModule | undefined>;
  let previousListeners: Array<(...args: unknown[]) => void>;
  let caches: Record<Resource, InstanceType<typeof MemoryCache>>;
  let getAdapter: sinon.SinonStub;

  beforeEach(function () {
    const paths = Object.values(endpointPaths);
    previousModules = new Map(paths.map((path) => [path, require.cache[path]]));
    for (const path of paths) {
      delete require.cache[path];
    }
    previousListeners = events.rawListeners('site.changed');
    // What boot does: Ghost listens for the events its roots declare, builds none of them, and
    // lets services be built.
    openServices();

    caches = { tags: new MemoryCache(), posts: new MemoryCache() };
    getAdapter = sandbox.stub(adapterManager, 'getAdapter');
    getAdapter.withArgs('cache:tagsPublic').returns(caches.tags);
    getAdapter.withArgs('cache:postsPublic').returns(caches.posts);
  });

  afterEach(async function () {
    await application.close();
    sandbox.restore();
    for (const [path, previous] of previousModules) {
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

  function cacheFor(resource: Resource) {
    return services[resource].service.cache;
  }

  // Delivers site.changed to the listeners Ghost attached when services opened, which reaches
  // every root that declares one. Broadcasting on the shared emitter would also reach listeners
  // other tests left behind. Actual event dispatch is covered by the isolated HTTP tests.
  function siteChanged() {
    const listeners = events
      .rawListeners('site.changed')
      .filter((listener: (...args: unknown[]) => void) => !previousListeners.includes(listener));
    assert.ok(listeners.length >= 2);
    for (const listener of listeners) {
      listener.call(events);
    }
  }

  for (const resource of resources) {
    const other: Resource = resource === 'tags' ? 'posts' : 'tags';

    describe(`${resource}-public service`, function () {
      // The other flag is always set to the opposite value, so reading the
      // wrong flag fails both cases.
      it('uses its own adapter when its flag is enabled', async function () {
        setFlags({ [resource]: true, [other]: false } as Record<Resource, boolean>);

        assert.equal(cacheFor(resource), caches[resource]);
        sinon.assert.calledOnceWithExactly(getAdapter, `cache:${resource}Public`);
      });

      it('has no cache when its flag is disabled, and a site change then resets nothing', async function () {
        setFlags({ [resource]: false, [other]: true } as Record<Resource, boolean>);
        caches[resource].set('key', 'value');

        assert.equal(cacheFor(resource), undefined);
        siteChanged();

        sinon.assert.neverCalledWith(getAdapter, `cache:${resource}Public`);
        assert.deepEqual(caches[resource].keys(), ['key']);
      });

      // The listener is declared, so it is attached before the service exists.
      it('resets its cache on a site.changed published before anything has used the service', async function () {
        setFlags({ tags: true, posts: true });
        caches[resource].set('key', 'value');
        sinon.assert.notCalled(getAdapter);

        siteChanged();

        sinon.assert.calledWithExactly(getAdapter, `cache:${resource}Public`);
        assert.deepEqual(caches[resource].keys(), []);
        assert.equal(cacheFor(resource), caches[resource]);
      });

      it('resets its cache on site.changed once it has been used', async function () {
        setFlags({ tags: true, posts: true });
        cacheFor(resource).set('key', 'value');

        siteChanged();

        assert.deepEqual(caches[resource].keys(), []);
      });

      it('is built only once, and a site change resets its cache once', async function () {
        setFlags({ tags: true, posts: true });
        const reset = sandbox.spy(caches[resource], 'reset');

        const cache = cacheFor(resource);
        cache.set('key', 'value');
        // Opening services that are already open changes nothing.
        openServices();

        assert.equal(cacheFor(resource), cache);
        assert.equal(cache.get('key'), 'value');
        sinon.assert.calledOnceWithExactly(getAdapter, `cache:${resource}Public`);

        siteChanged();

        sinon.assert.calledOnce(reset);
      });

      it('is built again after Ghost stops and starts, and a site change still resets its cache once', async function () {
        setFlags({ tags: true, posts: true });
        const reset = sandbox.spy(caches[resource], 'reset');
        const first = services[resource].service;

        await application.close();
        // Nothing listens while Ghost is stopped.
        assert.deepEqual(events.rawListeners('site.changed'), previousListeners);
        openServices();

        assert.notEqual(services[resource].service, first);

        siteChanged();

        sinon.assert.calledOnce(reset);
      });
    });
  }

  describe('endpoint bindings', function () {
    for (const enabled of [true, false]) {
      it(`binds only enabled caches to their endpoints (enabled: ${enabled})`, async function () {
        setFlags({ tags: enabled, posts: enabled });

        // Endpoints capture their cache when they load, so they are loaded once the flags are set.
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
