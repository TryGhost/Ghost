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

// The unit suite shares one module registry (isolate: false), so this file
// loads its own settings service, cache and helpers rather than initializing
// the shared ones. Load transitive dependencies against the shared registry
// first, so no other module retains this file's copies.
require(settingsPath);

type Rows = Record<string, string | boolean>;
type Listener = (...args: unknown[]) => void;

describe('Settings repeated initialization', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeModule | undefined>;
  let previousListeners: Map<string | symbol, Listener[]>;
  let settings: { init(): Promise<void>; reset(): void };
  // Consumers retain these references, so every assertion reads through them.
  let cache: { get(key: string): unknown };
  let helpers: { isMembersInviteOnly(): boolean; allowSelfSignup(): boolean };
  let rows: Rows;
  let overrides: Rows;
  let findAll: sinon.SinonStub;
  let getAdapter: sinon.SinonStub;
  let populateDefaults: sinon.SinonStub;

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

    rows = {};
    overrides = {};
    sandbox.stub(sentry);
    sandbox.stub(limitService, 'isDisabled').returns(false);
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:settingsOverrides').callsFake(() => overrides);
    getConfig.withArgs('mail:from').returns('sender@example.com');
    getConfig.withArgs('site_uuid').returns(null);
    getAdapter = sandbox.stub(adapterManager, 'getAdapter');
    getAdapter.withArgs('cache:settings').returns(new MemoryCache());
    populateDefaults = sandbox.stub(models.Settings, 'populateDefaults').resolves();
    findAll = sandbox.stub(models.Settings, 'findAll').callsFake(async () => ({
      models: Object.entries(rows).map(([key, value]) => ({
        get: () => key,
        toJSON: () => ({ key, value, type: typeof value }),
      })),
    }));
  });

  afterEach(function () {
    // Cleanup only: a leaked listener fails the listener test, not whichever
    // test happens to run first.
    settings.reset();
    for (const name of events.eventNames()) {
      const previous = previousListeners.get(name) || [];
      for (const listener of events.rawListeners(name)) {
        if (!previous.includes(listener)) {
          events.removeListener(name, listener);
        }
      }
    }
    sandbox.restore();
    for (const [path, previous] of previousModules) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  it('refreshes database values, host overrides and calculated fields on each init', async function () {
    const enforcePublicSiteAccessLimit = sandbox.spy(
      settings as any,
      'enforcePublicSiteAccessLimit',
    );
    const validateSiteUuid = sandbox.spy(settings as any, 'validateSiteUuid');
    rows = {
      title: 'First title',
      description: 'First description',
      members_signup_access: 'invite',
    };
    overrides = { description: 'First host description' };
    await settings.init();

    assert.equal(cache.get('title'), 'First title');
    assert.equal(cache.get('description'), 'First host description');
    assert.equal(cache.get('allow_self_signup'), false);
    assert.equal(helpers.isMembersInviteOnly(), true);
    assert.equal(helpers.allowSelfSignup(), false);

    rows = {
      title: 'Second title',
      description: 'Second description',
      members_signup_access: 'all',
    };
    overrides = { description: 'Second host description' };
    await settings.init();

    assert.equal(cache.get('title'), 'Second title');
    assert.equal(cache.get('description'), 'Second host description');
    assert.equal(cache.get('allow_self_signup'), true);
    assert.equal(helpers.isMembersInviteOnly(), false);
    assert.equal(helpers.allowSelfSignup(), true);

    sinon.assert.calledTwice(populateDefaults);
    sinon.assert.calledTwice(enforcePublicSiteAccessLimit);
    sinon.assert.calledTwice(validateSiteUuid);
    sinon.assert.calledTwice(findAll);
    sinon.assert.alwaysCalledWithExactly(findAll, { context: { internal: true } });
    sinon.assert.calledTwice(getAdapter);
    sinon.assert.alwaysCalledWithExactly(getAdapter, 'cache:settings');
  });

  it('does not apply changed host overrides until the next init', async function () {
    rows = { title: 'Stored title' };
    overrides = { title: 'First host title' };
    await settings.init();

    overrides = { title: 'Second host title' };
    assert.equal(cache.get('title'), 'First host title');

    await settings.init();
    assert.equal(cache.get('title'), 'Second host title');
  });

  it('exposes the current database value once an override is removed, and drops removed rows', async function () {
    rows = { title: 'First title', description: 'First description' };
    overrides = { title: 'Host title' };
    await settings.init();
    assert.equal(cache.get('title'), 'Host title');

    rows = { title: 'Second title' };
    overrides = {};
    await settings.init();

    assert.equal(cache.get('title'), 'Second title');
    assert.equal(cache.get('description'), undefined);
  });

  it('does not add event listeners on repeated init', async function () {
    rows = { members_signup_access: 'all' };
    await settings.init();
    const counts = new Map(
      events.eventNames().map((name: string | symbol) => [name, events.listenerCount(name)]),
    );
    // Guard against a vacuous pass: init must have subscribed to something.
    assert.ok(
      events.listenerCount('settings.edited') >
        (previousListeners.get('settings.edited') || []).length,
    );
    assert.ok(events.listenerCount('settings.members_signup_access.edited') > 0);

    await settings.init();
    await settings.init();

    assert.deepEqual(
      new Map(
        events.eventNames().map((name: string | symbol) => [name, events.listenerCount(name)]),
      ),
      counts,
    );
  });

  it('keeps the previous cache when the database read fails, and refreshes on retry', async function () {
    rows = { title: 'Original title', members_signup_access: 'invite' };
    await settings.init();

    const readError = new Error('Settings read failed');
    findAll.onSecondCall().rejects(readError);
    rows = { title: 'Refreshed title', members_signup_access: 'all' };
    await assert.rejects(settings.init(), (error: unknown) => error === readError);

    assert.equal(cache.get('title'), 'Original title');
    assert.equal(helpers.allowSelfSignup(), false);

    await settings.init();
    assert.equal(cache.get('title'), 'Refreshed title');
    assert.equal(helpers.allowSelfSignup(), true);
  });
});
