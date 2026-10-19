import assert from 'node:assert/strict';
import sinon from 'sinon';

const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const sentry = require('../../../../../core/shared/sentry');
const StatsService = require('../../../../../core/server/services/stats/stats-service');

const modulePaths = [
  '../../../../../core/server/services/tinybird',
  '../../../../../core/server/services/tinybird/tinybird-service-wrapper',
  '../../../../../core/server/api/endpoints/tinybird',
].map((path) => require.resolve(path));

describe('Tinybird consumers across configuration changes', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeModule | undefined>;
  let tinybird: { instance: object | null | undefined };
  let endpoint: { token: { query(): Promise<{ token: string; exp?: string } | null> } };
  let getConfig: sinon.SinonStub;
  let getSetting: sinon.SinonStub;

  beforeEach(function () {
    previousModules = new Map(modulePaths.map((path) => [path, require.cache[path]]));
    for (const path of modulePaths) {
      delete require.cache[path];
    }
    getConfig = sandbox.stub(config, 'get').callThrough();
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('site_uuid').returns('site-a');
    sandbox.stub(logging, 'warn');
    sandbox.stub(sentry);
    tinybird = require('../../../../../core/server/services/tinybird');
    endpoint = require('../../../../../core/server/api/endpoints/tinybird');
  });

  afterEach(function () {
    sandbox.restore();
    for (const [path, previous] of previousModules) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  function configure(token: string | null, endpointUrl = 'https://stats.example') {
    const stats = token ? { token, endpoint: endpointUrl } : null;
    getConfig.withArgs('tinybird').returns(stats ? { stats } : null);
    getConfig.withArgs('tinybird:stats').returns(stats);
  }

  it('clears a configured instance when the site UUID is missing and can recover', async function () {
    configure('token-a');
    assert.deepEqual(await endpoint.token.query(), { token: 'token-a' });

    getSetting.withArgs('site_uuid').returns(undefined);
    assert.equal(await endpoint.token.query(), null);
    assert.equal(tinybird.instance, null);

    getSetting.withArgs('site_uuid').returns('site-b');
    assert.deepEqual(await endpoint.token.query(), { token: 'token-a' });
  });

  it('preserves the token captured by an existing stats consumer while new consumers use new config', async function () {
    configure('token-a', 'https://stats-a.example');
    getSetting.withArgs('web_analytics_enabled').returns(true);
    const request = { get: sandbox.stub().resolves({ body: { data: [{ visits: 3 }] } }) };
    const stats = StatsService.create({ knex: {}, config, settingsCache, request });
    const retained = stats.posts.tinybirdClient;
    const originalInstance = tinybird.instance;
    assert.ok(originalInstance);
    assert.deepEqual(await retained.fetch('api_kpis'), [{ visits: 3 }]);
    assert.equal(request.get.lastCall.args[1].headers.Authorization, 'Bearer token-a');

    configure('token-b', 'https://stats-b.example');
    getSetting.withArgs('site_uuid').returns('site-b');
    assert.deepEqual(await endpoint.token.query(), { token: 'token-b' });
    assert.ok(tinybird.instance);
    assert.notEqual(tinybird.instance, originalInstance);

    // Existing stats clients retain their token service, but reread URL
    // and site config. Record this mixed lifetime rather than assuming a
    // new root instance updates every previously captured dependency.
    assert.deepEqual(await retained.fetch('api_kpis'), [{ visits: 3 }]);
    const [url, options] = request.get.lastCall.args;
    assert.equal(new URL(url).origin, 'https://stats-b.example');
    assert.equal(new URL(url).searchParams.get('site_uuid'), 'site-b');
    assert.equal(options.headers.Authorization, 'Bearer token-a');

    const fresh = StatsService.create({ knex: {}, config, settingsCache, request });
    assert.deepEqual(await fresh.posts.tinybirdClient.fetch('api_kpis'), [{ visits: 3 }]);
    assert.equal(request.get.lastCall.args[1].headers.Authorization, 'Bearer token-b');
  });
});
