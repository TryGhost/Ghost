import assert from 'node:assert/strict';
import sinon from 'sinon';

const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const jwt = require('jsonwebtoken');
const TinybirdService = require('../../../../../core/server/services/tinybird/tinybird-service');
const ROOT_PATH = require.resolve('../../../../../core/server/services/tinybird');
const WRAPPER_PATH =
  require.resolve('../../../../../core/server/services/tinybird/tinybird-service-wrapper');

type Provider = {
  tinybirdConfig: unknown;
  siteUuid: string;
  isJwtEnabled: boolean;
  isLocalEnabled: boolean;
  isStatsEnabled: boolean;
  getToken(): { token: string; exp?: number } | null;
};

describe('Tinybird root', function () {
  let root: { instance: Provider | null | undefined; init(): void };
  let originalModules: Map<string, NodeJS.Module | undefined>;
  let sandbox: sinon.SinonSandbox;
  let getConfig: sinon.SinonStub;
  let getSetting: sinon.SinonStub;
  let warn: sinon.SinonStub;

  beforeEach(function () {
    originalModules = new Map([ROOT_PATH, WRAPPER_PATH].map((path) => [path, require.cache[path]]));
    for (const path of originalModules.keys()) {
      delete require.cache[path];
    }
    sandbox = sinon.createSandbox();
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('tinybird').returns({ stats: { token: 'static-token' } });
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('site_uuid').returns('settings-site');
    warn = sandbox.stub(logging, 'warn');
    root = require(ROOT_PATH);
  });

  afterEach(function () {
    sandbox.restore();
    for (const [path, original] of originalModules) {
      if (original) {
        require.cache[path] = original;
      } else {
        delete require.cache[path];
      }
    }
  });

  it('re-exports the wrapper and synchronously publishes a real provider on init', function () {
    assert.equal(root, require(WRAPPER_PATH));
    assert.equal(root.instance, undefined);
    assert.equal(root.init(), undefined);
    assert.ok((root.instance as Provider | null | undefined) instanceof TinybirdService);
    assert.equal(root.instance!.siteUuid, 'settings-site');
    assert.deepEqual(root.instance!.getToken(), { token: 'static-token' });
    sinon.assert.notCalled(warn);
  });

  it('requires a settings UUID even when a stats site override is configured', function () {
    const tinybirdConfig = { stats: { id: 'overridden-site', token: 'static-token' } };
    getConfig.withArgs('tinybird').returns(tinybirdConfig);
    getSetting.withArgs('site_uuid').returns(undefined);

    assert.equal(root.init(), undefined);
    assert.equal(root.instance, null);
    sinon.assert.calledOnceWithExactly(warn, 'Tinybird service not configured');

    getSetting.withArgs('site_uuid').returns('settings-site');
    assert.equal(root.init(), undefined);
    assert.ok((root.instance as Provider | null | undefined) instanceof TinybirdService);
    assert.equal(root.instance!.siteUuid, 'overridden-site');
    assert.equal(root.instance!.tinybirdConfig, tinybirdConfig);
    sinon.assert.calledOnce(warn);
  });

  it('clears the published provider when configuration disappears and can recover without changing a retained provider', function () {
    root.init();
    const retained = root.instance!;
    getConfig.withArgs('tinybird').returns(null);

    assert.equal(root.init(), undefined);
    assert.equal(root.instance, null);
    sinon.assert.calledOnceWithExactly(warn, 'Tinybird service not configured');
    assert.deepEqual(retained.getToken(), { token: 'static-token' });

    getConfig.withArgs('tinybird').returns({ stats: { token: 'recovered-token' } });
    assert.equal(root.init(), undefined);
    assert.ok((root.instance as Provider | null | undefined) instanceof TinybirdService);
    assert.notEqual(root.instance, retained);
    assert.deepEqual(root.instance!.getToken(), { token: 'recovered-token' });
    assert.deepEqual(retained.getToken(), { token: 'static-token' });
    sinon.assert.calledOnce(warn);
  });

  it('defers signing until token use, so invalid signing material does not fail init', function () {
    getConfig.withArgs('tinybird').returns({ workspaceId: 'workspace', adminToken: {} });
    const sign = sandbox.spy(jwt, 'sign');

    assert.equal(root.init(), undefined);
    assert.ok((root.instance as Provider | null | undefined) instanceof TinybirdService);
    assert.equal(root.instance!.isJwtEnabled, true);
    sinon.assert.notCalled(sign);
    assert.throws(
      () => root.instance!.getToken(),
      (error) => {
        sinon.assert.calledOnce(sign);
        assert.ok(error instanceof Error);
        assert.equal(error, sign.firstCall.exception);
        return true;
      },
    );
    sinon.assert.calledOnce(sign);
    sinon.assert.notCalled(warn);
  });

  for (const stage of ['configuration', 'settings', 'construction', 'warning']) {
    it(`keeps the published provider when ${stage} fails`, function () {
      root.init();
      const retained = root.instance;
      const failure = new Error(`${stage} failed`);
      if (stage === 'configuration') {
        getConfig.withArgs('tinybird').throws(failure);
      } else if (stage === 'settings') {
        getSetting.withArgs('site_uuid').throws(failure);
      } else if (stage === 'construction') {
        getConfig.withArgs('tinybird').returns({
          get stats() {
            throw failure;
          },
        });
      } else {
        getConfig.withArgs('tinybird').returns(null);
        warn.throws(failure);
      }
      assert.throws(
        () => root.init(),
        (error) => error === failure,
      );
      assert.equal(root.instance, retained);
    });
  }

  it('replaces the provider on each init while retained providers keep captured flags and site but read their config object', function () {
    const tinybirdConfig = {
      stats: {
        id: 'first-site',
        token: 'first-token',
        local: { enabled: false, token: 'local-token' },
      },
    };
    getConfig.withArgs('tinybird').returns(tinybirdConfig);
    root.init();
    const retained = root.instance!;
    assert.equal(retained.tinybirdConfig, tinybirdConfig);
    assert.deepEqual(retained.getToken(), { token: 'first-token' });

    tinybirdConfig.stats.id = 'second-site';
    tinybirdConfig.stats.token = 'changed-token';
    tinybirdConfig.stats.local.enabled = true;
    assert.equal(retained.siteUuid, 'first-site');
    assert.equal(retained.isLocalEnabled, false);
    assert.equal(retained.isStatsEnabled, true);
    assert.deepEqual(retained.getToken(), { token: 'changed-token' });

    tinybirdConfig.stats.token = '';
    assert.equal(retained.isStatsEnabled, true);
    assert.deepEqual(retained.getToken(), { token: '' });

    assert.equal(root.init(), undefined);
    assert.ok((root.instance as Provider | null | undefined) instanceof TinybirdService);
    assert.notEqual(root.instance, retained);
    assert.equal(root.instance!.tinybirdConfig, tinybirdConfig);
    assert.equal(root.instance!.siteUuid, 'second-site');
    assert.equal(root.instance!.isLocalEnabled, true);
    assert.equal(root.instance!.isStatsEnabled, false);
    assert.deepEqual(root.instance!.getToken(), { token: 'local-token' });
    assert.deepEqual(retained.getToken(), { token: '' });
  });
});
