import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootstrapFile } from '../../../boot/harness';
import { openServices, services } from '../../../../utils/services';

const models = require('../../../../../core/server/models');
const cache = require('../../../../../core/shared/custom-theme-settings-cache');
const frontendBridge = require('../../../../../core/bridge');
const themeLoader = require('../../../../../core/server/services/themes/loader');
const validate = require('../../../../../core/server/services/themes/validate');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');

const ROOT_PATH = require.resolve('../../../../../core/server/services/custom-theme-settings');
const BRIDGE_PATH = require.resolve('../../../../../core/server/services/themes/activation-bridge');
const ACTIVATE_PATH = require.resolve('../../../../../core/server/services/themes/activate');
const THEMES_PATH = require.resolve('../../../../../core/server/services/themes');
const CONTROLLER_PATH =
  require.resolve('../../../../../core/server/api/endpoints/custom-theme-settings');
const MODULE_PATHS = [ROOT_PATH, BRIDGE_PATH, ACTIVATE_PATH, THEMES_PATH, CONTROLLER_PATH];

const checkedTheme = {
  name: 'casper',
  customSettings: {
    accent_color: { type: 'color', default: '#112233' },
  },
  results: { hasFatalErrors: false, error: [], warning: [] },
};
const theme = { name: 'casper', path: '/theme/casper' };

function settingsCollection() {
  return {
    toJSON: () => [
      { id: 'setting-id', theme: 'casper', key: 'accent_color', type: 'color', value: '#112233' },
    ],
  };
}

describe('Custom theme settings root and retained consumers', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeJS.Module | undefined>;
  let previousCache: Record<string, unknown>;
  let root: { service: { listSettings(): unknown[] } };
  let activation: Record<
    'activateFromBoot' | 'activateFromAPI' | 'activateFromAPIOverride',
    (name: string, loaded: typeof theme, checked: typeof checkedTheme) => Promise<void>
  >;
  let controller: { browse: { query(): unknown[] } };
  let themes: { init(): Promise<void> };
  let findAll: sinon.SinonStub;
  let populate: sinon.SinonSpy;
  let activateFrontend: sinon.SinonStub;

  beforeEach(function () {
    previousModules = new Map(Object.entries(require.cache));
    for (const path of MODULE_PATHS) {
      delete require.cache[path];
    }
    previousCache = cache.getAll();
    cache.populate([{ key: 'previous', value: 'still cached' }]);
    findAll = sandbox.stub(models.CustomThemeSetting, 'findAll').resolves(settingsCollection());
    populate = sandbox.spy(cache, 'populate');
    activateFrontend = sandbox.stub(frontendBridge, 'activateTheme').resolves();
    sandbox.stub(validate, 'init');
    sandbox.stub(validate, 'check').resolves(checkedTheme);
    sandbox.stub(themeLoader, 'loadOneTheme').resolves(theme);
    sandbox.stub(settingsCache, 'get').callThrough().withArgs('active_theme').returns('casper');

    // These real consumers retain the root before anything builds its service.
    root = require(ROOT_PATH).default;
    activation = require(BRIDGE_PATH);
    controller = require(CONTROLLER_PATH);
    themes = require(THEMES_PATH);
  });

  afterEach(function () {
    sandbox.restore();
    cache.populate(Object.entries(previousCache).map(([key, value]) => ({ key, value })));
    // Requiring the fresh modules also loads the modules that depend on them, such
    // as themes/storage, and those keep the fresh copies. Put the whole cache back
    // as it was, so later suites load them against the identities they stub.
    for (const path of Object.keys(require.cache)) {
      if (!previousModules.has(path)) {
        delete require.cache[path];
      }
    }
    for (const [path, previousModule] of previousModules) {
      require.cache[path] = previousModule;
    }
  });

  // The two entries of Ghost's start that load the active theme and then offers.
  function bootFrontend() {
    const offers = { init: sandbox.stub().resolves() };
    const { entries } = loadBootstrapFile('transition/steps.ts', {
      './server/services/themes': themes,
      './server/services/offers': offers,
    }) as unknown as {
      entries: Record<string, { run(run: unknown): unknown }>;
    };
    const run = { state: { bootLogger: { metric() {} } } };
    return {
      init: async () => {
        await entries.themes!.run(run);
        await entries.offers!.run(run);
      },
      offers,
    };
  }

  it('builds on first use without querying settings, activating a theme or replacing the shared cache', function () {
    openServices();

    assert.deepEqual(controller.browse.query(), []);
    assert.deepEqual(cache.getAll(), { previous: 'still cached' });
    sinon.assert.notCalled(findAll);
    sinon.assert.notCalled(populate);
    sinon.assert.notCalled(activateFrontend);
  });

  for (const method of [
    'activateFromBoot',
    'activateFromAPI',
    'activateFromAPIOverride',
  ] as const) {
    it(`${method} waits for custom settings before activating the frontend`, async function () {
      openServices();
      const read = Promise.withResolvers<ReturnType<typeof settingsCollection>>();
      findAll.onFirstCall().returns(read.promise);
      let completed = false;
      const activationPromise = activation[method]('casper', theme, checkedTheme).then(() => {
        completed = true;
      });
      const settled = activationPromise.catch(() => {});

      try {
        await setImmediate();
        sinon.assert.calledOnce(findAll);
        sinon.assert.notCalled(activateFrontend);
        sinon.assert.notCalled(populate);
        assert.equal(completed, false);

        read.resolve(settingsCollection());
        await activationPromise;
        sinon.assert.calledOnceWithExactly(activateFrontend, theme, checkedTheme);
        assert.deepEqual(cache.getAll(), { accent_color: '#112233' });
        assert.deepEqual(controller.browse.query(), [
          {
            id: 'setting-id',
            key: 'accent_color',
            type: 'color',
            default: '#112233',
            value: '#112233',
          },
        ]);
      } finally {
        read.resolve(settingsCollection());
        await settled;
      }
    });
  }

  it('is built by theme startup and activates on every boot through retained consumers', async function () {
    openServices();
    const boot = bootFrontend();

    await boot.init();
    assert.deepEqual(cache.getAll(), { accent_color: '#112233' });
    // The controller reads the instance theme startup built.
    assert.equal(controller.browse.query().length, 1);
    assert.equal(root.service.listSettings().length, 1);
    sinon.assert.calledTwice(findAll);
    sinon.assert.callOrder(findAll, activateFrontend, boot.offers.init);

    findAll.resetHistory();
    activateFrontend.resetHistory();
    await boot.init();

    sinon.assert.calledTwice(findAll);
    sinon.assert.calledOnceWithExactly(activateFrontend, theme, checkedTheme);
    assert.deepEqual(cache.getAll(), { accent_color: '#112233' });
    assert.equal(controller.browse.query().length, 1);
  });

  it('logs failed boot activation and continues without activating the frontend or changing the cache', async function () {
    const failure = new Error('Custom setting lookup failed');
    findAll.rejects(failure);
    const error = sandbox.stub(logging, 'error');
    openServices();
    const boot = bootFrontend();

    await boot.init();

    sinon.assert.calledOnceWithExactly(error, failure);
    sinon.assert.calledOnce(boot.offers.init);
    sinon.assert.notCalled(activateFrontend);
    sinon.assert.notCalled(populate);
    assert.deepEqual(cache.getAll(), { previous: 'still cached' });
    assert.deepEqual(controller.browse.query(), []);
  });

  it('keeps an in-flight activation usable after the services are closed and reopened, and lets retained consumers activate again', async function () {
    openServices();
    const retained = root.service;
    const read = Promise.withResolvers<ReturnType<typeof settingsCollection>>();
    findAll.onFirstCall().returns(read.promise);
    const activationPromise = activation.activateFromBoot('casper', theme, checkedTheme);
    const settled = activationPromise.catch(() => {});

    try {
      await setImmediate();
      sinon.assert.calledOnce(findAll);
      // What a second boot in one process does: the next use builds a new instance.
      await services.close();
      openServices();
      assert.notEqual(root.service, retained);
      assert.deepEqual(cache.getAll(), { previous: 'still cached' });
      read.resolve(settingsCollection());
      await activationPromise;

      assert.equal(retained.listSettings().length, 1);
      assert.deepEqual(cache.getAll(), { accent_color: '#112233' });
      await activation.activateFromAPI('casper', theme, checkedTheme);
      assert.equal(controller.browse.query().length, 1);
      sinon.assert.calledTwice(activateFrontend);
    } finally {
      read.resolve(settingsCollection());
      await settled;
    }
  });
});
