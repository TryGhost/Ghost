import assert from 'node:assert/strict';
import sinon from 'sinon';
import { IncorrectUsageError } from '@tryghost/errors';

const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const db = require('../../../../../core/server/data/db');
const urlService = require('../../../../../core/server/services/url');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const TinybirdServiceWrapper = require('../../../../../core/server/services/tinybird');
const requestExternal = require('../../../../../core/server/lib/request-external');
// Use the same CommonJS class object the root constructs with.
const StatsService = require('../../../../../core/server/services/stats/stats-service');

const ROOT_PATH = require.resolve('../../../../../core/server/services/stats');
const ENDPOINT_PATH = require.resolve('../../../../../core/server/api/endpoints/stats');
const QUERY_SERVICES = ['mrr', 'members', 'subscriptions', 'referrers', 'posts', 'content'];

type Root = (typeof import('../../../../../core/server/services/stats'))['default'];
type EndpointCache = {
  get(key: string, fetchData: () => Promise<unknown>): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
};
type EndpointMethod = { cache: EndpointCache; query(frame?: object): Promise<unknown> };
type TinybirdClient = {
  buildRequest(pipe: string): { url: string; options: { headers: { Authorization: string } } };
  fetch(pipe: string): Promise<unknown>;
};

describe('Stats service root', function () {
  const sandbox = sinon.createSandbox();
  const modulePaths = [ROOT_PATH, ENDPOINT_PATH];
  let savedModules: Map<string, NodeJS.Module | undefined>;
  let savedTinybirdInstance: unknown;
  let getConfig: sinon.SinonStub;
  let getSetting: sinon.SinonStub;
  let getAdapter: sinon.SinonStub;
  let tinybirdInit: sinon.SinonStub;
  let cache: object;
  let tinybirdInstance: { getToken: sinon.SinonStub };

  function loadRoot(): Root {
    return require(ROOT_PATH).default;
  }

  function loadEndpoint(): Record<string, EndpointMethod> {
    const controller = require(ENDPOINT_PATH);
    return Object.fromEntries(
      Object.entries(controller).filter(([, value]) => typeof value === 'object' && value !== null),
    ) as Record<string, EndpointMethod>;
  }

  beforeEach(function () {
    // The unit project shares one module registry: load a fresh root per
    // test and restore the original for the files that captured it.
    savedModules = new Map(modulePaths.map((path) => [path, require.cache[path]]));
    for (const path of modulePaths) {
      delete require.cache[path];
    }
    savedTinybirdInstance = TinybirdServiceWrapper.instance;
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:statsCache:enabled').returns(false);
    getConfig.withArgs('tinybird:stats').returns(null);
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('web_analytics_enabled').returns(false);
    getSetting.withArgs('site_uuid').returns('site-a');
    cache = { get: sandbox.stub(), set: sandbox.stub() };
    getAdapter = sandbox.stub(adapterManager, 'getAdapter').returns(cache);
    tinybirdInstance = { getToken: sandbox.stub().returns({ token: 'token-a' }) };
    tinybirdInit = sandbox.stub(TinybirdServiceWrapper, 'init').callsFake(() => {
      TinybirdServiceWrapper.instance = tinybirdInstance;
    });
  });

  afterEach(function () {
    sandbox.restore();
    TinybirdServiceWrapper.instance = savedTinybirdInstance;
    for (const [path, saved] of savedModules) {
      delete require.cache[path];
      if (saved) {
        require.cache[path] = saved;
      }
    }
  });

  it('guards the service until init has resolved', async function () {
    const root = loadRoot();
    assert.throws(() => root.service, IncorrectUsageError);

    const pending = root.init();

    // Nothing is published while init is in flight, unlike the former wrapper.
    assert.throws(() => root.service, IncorrectUsageError);
    assert.equal(await pending, undefined);
    assert.ok(root.service.api instanceof StatsService);
  });

  it('publishes one Stats API over the shared database and URL service', async function () {
    const root = loadRoot();

    await root.init();

    const { api, cache: published } = root.service;
    assert.ok(api instanceof StatsService);
    assert.equal(published, null);
    for (const name of QUERY_SERVICES) {
      assert.equal(api[name].knex, db.knex, `${name} queries the shared connection`);
    }
    assert.equal(api.posts.urlService, urlService);
    assert.equal(api.content.urlService, urlService);
    assert.equal(api.posts.tinybirdClient, null);
    assert.equal(api.content.tinybirdClient, null);
  });

  it('leaves the cache unset when the host stats cache is disabled', async function () {
    const root = loadRoot();

    await root.init();

    sinon.assert.notCalled(getAdapter);
    assert.equal(root.service.cache, null);
  });

  it('publishes the cache:stats adapter with the API when the host stats cache is enabled', async function () {
    getConfig.withArgs('hostSettings:statsCache:enabled').returns(true);
    const root = loadRoot();

    await root.init();

    sinon.assert.calledOnceWithExactly(getAdapter, 'cache:stats');
    assert.equal(root.service.cache, cache);
    assert.ok(root.service.api instanceof StatsService);
  });

  it('retains the first aggregate on repeated init, even once the cache is enabled', async function () {
    const root = loadRoot();
    await root.init();
    const aggregate = root.service;
    getConfig.withArgs('hostSettings:statsCache:enabled').returns(true);

    assert.equal(await root.init(), undefined);

    assert.equal(root.service, aggregate);
    assert.equal(root.service.cache, null);
    sinon.assert.notCalled(getAdapter);
  });

  it('rejects init without publishing when the database connection is unavailable, then allows a retry', async function () {
    const failure = new Error('Database unavailable');
    const connection = Object.getOwnPropertyDescriptor(db, 'knex');
    assert.ok(connection);
    const root = loadRoot();
    Object.defineProperty(db, 'knex', {
      configurable: true,
      enumerable: true,
      get() {
        throw failure;
      },
    });

    try {
      await assert.rejects(root.init(), (error: unknown) => error === failure);
      assert.throws(() => root.service, IncorrectUsageError);
    } finally {
      Object.defineProperty(db, 'knex', connection);
    }

    assert.equal(await root.init(), undefined);
    assert.ok(root.service.api instanceof StatsService);
    assert.equal(root.service.api.mrr.knex, db.knex);
  });

  it('rejects init without publishing when the cache adapter fails, then retries the whole aggregate', async function () {
    getConfig.withArgs('hostSettings:statsCache:enabled').returns(true);
    const failure = new Error('Cache unavailable');
    getAdapter.onFirstCall().throws(failure);
    const root = loadRoot();

    await assert.rejects(root.init(), (error: unknown) => error === failure);

    // The former wrapper kept a cacheless API after this failure; the
    // aggregate is now published atomically or not at all.
    assert.throws(() => root.service, IncorrectUsageError);

    assert.equal(await root.init(), undefined);
    assert.ok(root.service.api instanceof StatsService);
    assert.equal(root.service.cache, cache);
    sinon.assert.calledTwice(getAdapter);
  });

  it('lets the Admin stats endpoint load before init and resolves the cache and API per request', async function () {
    getConfig.withArgs('hostSettings:statsCache:enabled').returns(true);
    const root = loadRoot();

    // The Admin routes load the endpoint before boot initializes Stats.
    const endpoint = loadEndpoint();
    const names = Object.keys(endpoint);
    assert.ok(names.includes('subscriptions'));
    const statsCache = endpoint.subscriptions.cache;
    assert.ok(statsCache);
    for (const name of names) {
      assert.equal(endpoint[name].cache, statsCache, `${name} uses the shared stats cache`);
    }
    await assert.rejects(endpoint.subscriptions.query(), IncorrectUsageError);

    await root.init();
    const history = { data: [] };
    const fetchData = sandbox.stub().resolves(history);
    const adapter = root.service.cache as { get: sinon.SinonStub; set: sinon.SinonStub };
    adapter.get.resolves(history);
    assert.equal(await statsCache.get('key', fetchData), history);
    sinon.assert.calledOnceWithExactly(adapter.get, 'key', fetchData);
    sinon.assert.notCalled(fetchData);
    await statsCache.set('key', history);
    sinon.assert.calledOnceWithExactly(adapter.set, 'key', history);

    const getSubscriptionCountHistory = sandbox
      .stub(root.service.api, 'getSubscriptionCountHistory')
      .resolves(history);
    assert.equal(await endpoint.subscriptions.query(), history);
    sinon.assert.calledOnce(getSubscriptionCountHistory);
    assert.equal(getSubscriptionCountHistory.firstCall.thisValue, root.service.api);

    // Each request reads the API and the cache from the aggregate.
    const replacement = { getSubscriptionCountHistory: sandbox.stub().resolves(history) };
    root.service.api = replacement;
    assert.equal(await endpoint.subscriptions.query(), history);
    sinon.assert.calledOnce(replacement.getSubscriptionCountHistory);
    sinon.assert.calledOnce(getSubscriptionCountHistory);

    // Without a cache the request runs its query and stores nothing.
    root.service.cache = null;
    assert.equal(await statsCache.get('key', fetchData), history);
    sinon.assert.calledOnce(fetchData);
    assert.equal(await statsCache.set('key', history), undefined);
    sinon.assert.calledOnce(adapter.get);
    sinon.assert.calledOnce(adapter.set);
  });

  it.each([
    { webAnalytics: false, configured: true, initialized: true },
    { webAnalytics: false, configured: false, initialized: false },
    { webAnalytics: true, configured: false, initialized: true },
  ])(
    'initializes Tinybird for the enabled analytics source and creates a query client only for web analytics: %j',
    async function ({ webAnalytics, configured, initialized }) {
      getSetting.withArgs('web_analytics_enabled').returns(webAnalytics);
      getConfig
        .withArgs('tinybird:stats')
        .returns(configured ? { endpoint: 'https://stats.example' } : null);
      const root = loadRoot();

      await root.init();

      sinon.assert.callCount(tinybirdInit, initialized ? 1 : 0);
      assert.equal(Boolean(root.service.api.posts.tinybirdClient), webAnalytics);
      assert.equal(Boolean(root.service.api.content.tinybirdClient), webAnalytics);
    },
  );

  it('shares one query client that keeps the Tinybird instance from init but rereads config and settings', async function () {
    getSetting.withArgs('web_analytics_enabled').returns(true);
    getConfig.withArgs('tinybird:stats').returns({ endpoint: 'https://stats-a.example' });
    const root = loadRoot();

    await root.init();

    sinon.assert.calledOnce(tinybirdInit);
    const client: TinybirdClient = root.service.api.posts.tinybirdClient;
    assert.ok(client);
    assert.equal(root.service.api.content.tinybirdClient, client);
    const first = client.buildRequest('api_kpis');
    assert.equal(
      first.url,
      'https://stats-a.example/v0/pipes/api_kpis.json?site_uuid=site-a&ghost_client=server',
    );
    assert.equal(first.options.headers.Authorization, 'Bearer token-a');

    TinybirdServiceWrapper.instance = { getToken: () => ({ token: 'token-b' }) };
    getConfig.withArgs('tinybird:stats').returns({ endpoint: 'https://stats-b.example' });
    getSetting.withArgs('site_uuid').returns('site-b');

    const second = client.buildRequest('api_kpis');
    assert.equal(
      second.url,
      'https://stats-b.example/v0/pipes/api_kpis.json?site_uuid=site-b&ghost_client=server',
    );
    assert.equal(second.options.headers.Authorization, 'Bearer token-a');
  });

  it('sends query client requests through the shared external request client', async function () {
    getSetting.withArgs('web_analytics_enabled').returns(true);
    getConfig.withArgs('tinybird:stats').returns({ endpoint: 'https://stats-a.example' });
    const get = sandbox.stub(requestExternal, 'get').resolves({ body: { data: [{ visits: 3 }] } });
    const root = loadRoot();

    await root.init();

    const client: TinybirdClient = root.service.api.posts.tinybirdClient;
    assert.deepEqual(await client.fetch('api_kpis'), [{ visits: 3 }]);
    sinon.assert.calledOnce(get);
    const [url, options] = get.firstCall.args;
    assert.equal(
      url,
      'https://stats-a.example/v0/pipes/api_kpis.json?site_uuid=site-a&ghost_client=server',
    );
    assert.equal(options.headers.Authorization, 'Bearer token-a');
  });
});
