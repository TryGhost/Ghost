import assert from 'node:assert/strict';
import sinon from 'sinon';

const config = require('../../../../../core/shared/config');
const events = require('../../../../../core/server/lib/common/events');
const models = require('../../../../../core/server/models');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const { limitService } = require('../../../../../core/server/services/limits');
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');
const sentry = require('../../../../../core/shared/sentry');

const settingsPath = '../../../../../core/server/services/settings';
const cachePath = '../../../../../core/shared/settings-cache';
const helpersPath = '../../../../../core/server/services/settings-helpers';
const modulePaths = [
  settingsPath,
  '../../../../../core/server/services/settings/settings-service',
  cachePath,
  helpersPath,
  '../../../../../core/shared/labs',
].map((path) => require.resolve(path));

// Load transitive dependencies against the shared registry before isolating
// these roots. No other module should retain this test's fresh cache or helper.
require(settingsPath);

describe('Settings repeated initialization', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeModule | undefined>;
  let settings: { init(): Promise<void>; reset(): void };
  let cache: { get(key: string): unknown };
  let helpers: {
    isMembersEnabled(): boolean;
    isMembersInviteOnly(): boolean;
    allowSelfSignup(): boolean;
  };
  let previousListeners: Map<string | symbol, Array<(...args: unknown[]) => void>>;

  beforeEach(function () {
    previousModules = new Map(modulePaths.map((path) => [path, require.cache[path]]));
    previousListeners = new Map(
      events.eventNames().map((name: string | symbol) => [name, events.rawListeners(name)]),
    );
    for (const path of modulePaths) {
      delete require.cache[path];
    }
    settings = require(settingsPath);
    cache = require(cachePath);
    helpers = require(helpersPath);
    sandbox.stub(sentry);
    sandbox.stub(limitService, 'isDisabled').returns(false);
  });

  afterEach(function () {
    try {
      // reset() removes only this fresh cache's exact listener references;
      // the shared emitter and other suites' subscribers remain untouched.
      settings.reset();
      for (const name of new Set([...previousListeners.keys(), ...events.eventNames()])) {
        assert.deepEqual(events.rawListeners(name), previousListeners.get(name) || []);
      }
    } finally {
      sandbox.restore();
      for (const [path, previous] of previousModules) {
        delete require.cache[path];
        if (previous) {
          require.cache[path] = previous;
        }
      }
    }
  });

  function setup(initialRows: Record<string, string | boolean>) {
    const store = new MemoryCache();
    let rows = initialRows;
    let overrides: Record<string, string | boolean> = {};
    let customIntegrationsDisabled = false;
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:settingsOverrides').callsFake(() => overrides);
    getConfig
      .withArgs('hostSettings:limits:customIntegrations:disabled')
      .callsFake(() => customIntegrationsDisabled);
    getConfig.withArgs('mail:from').returns('sender@example.com');
    getConfig.withArgs('site_uuid').returns(null);
    const getAdapter = sandbox.stub(adapterManager, 'getAdapter');
    getAdapter.withArgs('cache:settings').returns(store);
    const populateDefaults = sandbox.stub(models.Settings, 'populateDefaults').resolves();
    const findAll = sandbox.stub(models.Settings, 'findAll').callsFake(async () => ({
      models: Object.entries(rows).map(([key, value]) => ({
        get: () => key,
        toJSON: () => ({ key, value, type: typeof value }),
      })),
    }));
    return {
      getAdapter,
      populateDefaults,
      findAll,
      setRows(value: typeof rows) {
        rows = value;
      },
      setOverrides(value: typeof overrides) {
        overrides = value;
      },
      setCustomIntegrationsDisabled(value: boolean) {
        customIntegrationsDisabled = value;
      },
    };
  }

  it('refreshes stored settings and host overrides through the same retained consumer', async function () {
    const source = setup({
      title: 'First stored title',
      description: 'First description',
      members_signup_access: 'all',
      transistor: true,
    });
    source.setOverrides({
      title: 'First host title',
      members_signup_access: 'invite',
      transistor: true,
    });
    source.setCustomIntegrationsDisabled(true);
    const retainedHelpers = helpers;
    const retainedCacheGetter = cache.get;

    await settings.init();
    assert.equal(retainedCacheGetter('title'), 'First host title');
    assert.equal(retainedCacheGetter('description'), 'First description');
    assert.equal(retainedCacheGetter('transistor'), false);
    assert.equal(retainedHelpers.isMembersInviteOnly(), true);
    assert.equal(retainedHelpers.allowSelfSignup(), false);
    assert.equal(retainedCacheGetter('allow_self_signup'), false);
    const initializedListenerCounts = new Map(
      events.eventNames().map((name: string | symbol) => [name, events.listenerCount(name)]),
    );

    source.setRows({
      title: 'Second stored title',
      description: 'Second description',
      members_signup_access: 'none',
      transistor: true,
    });
    source.setOverrides({ title: 'Second host title', members_signup_access: 'all' });
    source.setCustomIntegrationsDisabled(false);
    // Host overrides are captured by init; changing config alone is insufficient.
    assert.equal(retainedCacheGetter('title'), 'First host title');
    assert.equal(retainedHelpers.allowSelfSignup(), false);

    await settings.init();
    assert.equal(retainedCacheGetter('title'), 'Second host title');
    assert.equal(retainedCacheGetter('description'), 'Second description');
    assert.equal(retainedCacheGetter('transistor'), true);
    assert.equal(retainedHelpers.isMembersInviteOnly(), false);
    assert.equal(retainedHelpers.allowSelfSignup(), true);
    assert.equal(retainedCacheGetter('allow_self_signup'), true);

    // Removing an override must expose the new database value, without stale
    // rows or calculated fields surviving from either previous initialization.
    source.setRows({
      title: 'Third stored title',
      members_signup_access: 'none',
      transistor: false,
    });
    source.setOverrides({});
    await settings.init();
    assert.equal(retainedCacheGetter('title'), 'Third stored title');
    assert.equal(retainedCacheGetter('description'), undefined);
    assert.equal(retainedCacheGetter('transistor'), false);
    assert.equal(retainedHelpers.isMembersEnabled(), false);
    assert.equal(retainedHelpers.allowSelfSignup(), false);
    assert.equal(retainedCacheGetter('members_enabled'), false);
    assert.equal(retainedCacheGetter('allow_self_signup'), false);
    assert.equal(require(settingsPath), settings);
    assert.equal(require(helpersPath), retainedHelpers);
    assert.equal(require(cachePath).get, retainedCacheGetter);
    for (const [name, count] of initializedListenerCounts) {
      assert.equal(events.listenerCount(name), count, String(name));
    }
    sinon.assert.calledThrice(source.populateDefaults);
    sinon.assert.calledThrice(source.findAll);
    sinon.assert.alwaysCalledWithExactly(source.findAll, { context: { internal: true } });
    sinon.assert.calledThrice(source.getAdapter);
    sinon.assert.alwaysCalledWithExactly(source.getAdapter, 'cache:settings');
  });

  it('keeps the prior cache when reloading fails and refreshes it on retry', async function () {
    const source = setup({ title: 'Original title', members_signup_access: 'invite' });
    await settings.init();
    const retainedCacheGetter = cache.get;
    const retainedHelpers = helpers;
    assert.equal(retainedCacheGetter('title'), 'Original title');
    assert.equal(retainedHelpers.allowSelfSignup(), false);

    const readError = new Error('Settings read failed');
    source.findAll.onSecondCall().rejects(readError);
    source.setRows({ title: 'Refreshed title', members_signup_access: 'all' });
    await assert.rejects(settings.init(), (error: unknown) => error === readError);
    assert.equal(retainedCacheGetter('title'), 'Original title');
    assert.equal(retainedHelpers.allowSelfSignup(), false);

    await settings.init();
    assert.equal(retainedCacheGetter('title'), 'Refreshed title');
    assert.equal(retainedHelpers.allowSelfSignup(), true);
    assert.equal(retainedCacheGetter('allow_self_signup'), true);
  });
});
