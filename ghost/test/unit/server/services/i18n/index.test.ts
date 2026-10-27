import assert from 'node:assert/strict';
import sinon from 'sinon';

const events = require('../../../../../core/server/lib/common/events');
const settingsCache = require('../../../../../core/shared/settings-cache');
const ROOT_PATH = require.resolve('../../../../../core/server/services/i18n');
const LOCALE_EVENT = 'settings.locale.edited';
const NOT_INITIALIZED = /i18n used before init\(\)/;

type Root = typeof import('../../../../../core/server/services/i18n').default;
type LocaleListener = (model: { get: (key: string) => unknown }) => void;

describe('i18n root', function () {
  const sandbox = sinon.createSandbox();
  let originalModule: NodeJS.Module | undefined;
  let existingListeners: LocaleListener[];
  let getLocale: sinon.SinonStub;
  let root: Root;

  // Listeners this file's inits added to the shared process bus.
  function addedListeners(): LocaleListener[] {
    return events
      .listeners(LOCALE_EVENT)
      .filter((listener: LocaleListener) => !existingListeners.includes(listener));
  }

  beforeEach(function () {
    originalModule = require.cache[ROOT_PATH];
    existingListeners = events.listeners(LOCALE_EVENT);
    delete require.cache[ROOT_PATH];
    getLocale = sandbox.stub(settingsCache, 'get').withArgs('locale').returns('en');
    root = require(ROOT_PATH).default;
  });

  afterEach(function () {
    for (const listener of addedListeners()) {
      events.removeListener(LOCALE_EVENT, listener);
    }
    sandbox.restore();
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  it('throws before init when the service is read', function () {
    assert.throws(() => root.service, NOT_INITIALIZED);
  });

  it('does not subscribe to locale changes until init', async function () {
    assert.deepEqual(addedListeners(), []);

    await root.init();

    assert.equal(addedListeners().length, 1);
  });

  it('falls back to English when no locale is configured', async function () {
    getLocale.returns(undefined);
    await root.init();

    assert.equal(root.service.t('Gift subscription'), 'Gift subscription');
  });

  it('translates with the configured locale', async function () {
    getLocale.returns('fr');
    await root.init();

    assert.equal(root.service.t('Gift subscription'), 'Abonnement offert');
  });

  it('forwards translation options to the translator', async function () {
    getLocale.returns('fr');
    await root.init();

    assert.equal(
      root.service.t('Welcome back to {siteTitle}!', { siteTitle: 'Example' }),
      'Quel plaisir de vous revoir sur Example !',
    );
  });

  it('forwards direction arguments and reports the current direction', async function () {
    getLocale.returns('fr');
    await root.init();

    assert.equal(root.service.dir(), 'ltr');
    assert.equal(root.service.dir('ar'), 'rtl');
  });

  it('changes the language for the retained root and returns the translator', async function () {
    getLocale.returns('fr');
    await root.init();

    const translate = await root.service.changeLanguage('ar');

    assert.equal(root.service.dir(), 'rtl');
    assert.equal(
      root.service.t('Welcome back to {siteTitle}!', { siteTitle: 'Example' }),
      'مرحبا بك مرة اخرى في Example!',
    );
    assert.equal(
      translate('Welcome back to {siteTitle}!', { siteTitle: 'Example' }),
      'مرحبا بك مرة اخرى في Example!',
    );
  });

  it('changes the language when its locale listener receives an edited setting', async function () {
    await root.init();
    const get = sandbox.stub().returns('fr');
    const [listener] = addedListeners();

    // Call only this root's listener: roots loaded by other files share the process bus.
    listener.call(events, { get });

    assert.equal(root.service.t('Gift subscription'), 'Abonnement offert');
    sinon.assert.alwaysCalledWithExactly(get, 'value');
  });

  it('retains one translator and one listener across repeated init', async function () {
    await root.init();
    const translator = root.service;
    getLocale.returns('fr');

    await root.init();

    assert.equal(root.service, translator);
    assert.equal(root.service.t('Gift subscription'), 'Gift subscription');
    assert.equal(addedListeners().length, 1);
  });

  it('rejects init with a settings read failure without publishing a translator or listener', async function () {
    const failure = new Error('Locale setting unavailable');
    getLocale.throws(failure);

    await assert.rejects(root.init(), (error: unknown) => error === failure);

    assert.throws(() => root.service, NOT_INITIALIZED);
    assert.deepEqual(addedListeners(), []);
  });

  it('initializes after a failed init once the locale setting is readable', async function () {
    getLocale.throws(new Error('Locale setting unavailable'));
    await assert.rejects(root.init());
    getLocale.resetBehavior();
    getLocale.returns('fr');

    await root.init();

    assert.equal(root.service.t('Gift subscription'), 'Abonnement offert');
    assert.equal(addedListeners().length, 1);
  });
});
