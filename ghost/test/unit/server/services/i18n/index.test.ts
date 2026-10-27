import assert from 'node:assert/strict';
import sinon from 'sinon';

const events = require('../../../../../core/server/lib/common/events');
const settingsCache = require('../../../../../core/shared/settings-cache');
const ROOT_PATH = require.resolve('../../../../../core/server/services/i18n');
const LOCALE_EVENT = 'settings.locale.edited';
const NOT_INITIALIZED = /Expected i18n instance to be initialized/;

type TranslateOptions = Record<string, unknown>;
type Root = {
  init(): void;
  t(key: string, options?: TranslateOptions): string;
  dir(language?: string): string;
  changeLanguage(language: string): Promise<(key: string, options?: TranslateOptions) => string>;
};
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
    root = require(ROOT_PATH);
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

  it('throws before init when a retained delegate is called', function () {
    const { t, dir, changeLanguage } = root;

    assert.throws(() => t('Gift subscription'), NOT_INITIALIZED);
    assert.throws(() => dir(), NOT_INITIALIZED);
    assert.throws(() => changeLanguage('fr'), NOT_INITIALIZED);
  });

  it('does not subscribe to locale changes until init', function () {
    assert.deepEqual(addedListeners(), []);

    root.init();

    assert.equal(addedListeners().length, 1);
  });

  it('falls back to English when no locale is configured', function () {
    getLocale.returns(undefined);
    root.init();

    assert.equal(root.t('Gift subscription'), 'Gift subscription');
  });

  it('translates with the configured locale', function () {
    getLocale.returns('fr');
    root.init();

    assert.equal(root.t('Gift subscription'), 'Abonnement offert');
  });

  it('forwards translation options to the translator', function () {
    getLocale.returns('fr');
    root.init();

    assert.equal(
      root.t('Welcome back to {siteTitle}!', { siteTitle: 'Example' }),
      'Quel plaisir de vous revoir sur Example !',
    );
  });

  it('forwards direction arguments and reports the current direction', function () {
    getLocale.returns('fr');
    root.init();

    assert.equal(root.dir(), 'ltr');
    assert.equal(root.dir('ar'), 'rtl');
  });

  it('changes the language for retained delegates and returns the translator', async function () {
    getLocale.returns('fr');
    const { t, dir, changeLanguage } = root;
    root.init();

    const translate = await changeLanguage('ar');

    assert.equal(dir(), 'rtl');
    assert.equal(
      t('Welcome back to {siteTitle}!', { siteTitle: 'Example' }),
      'مرحبا بك مرة اخرى في Example!',
    );
    assert.equal(
      translate('Welcome back to {siteTitle}!', { siteTitle: 'Example' }),
      'مرحبا بك مرة اخرى في Example!',
    );
  });

  it('changes the language when its locale listener receives an edited setting', function () {
    const { t } = root;
    root.init();
    const get = sandbox.stub().returns('fr');
    const [listener] = addedListeners();

    // Call only this root's listener: roots loaded by other files share the process bus.
    listener.call(events, { get });

    assert.equal(t('Gift subscription'), 'Abonnement offert');
    sinon.assert.alwaysCalledWithExactly(get, 'value');
  });

  // Boot calls init once. Repeating it is current behaviour, not a supported contract.
  it('replaces the translator and adds another listener when init repeats', function () {
    const { t } = root;
    root.init();
    getLocale.returns('fr');

    root.init();

    assert.equal(t('Gift subscription'), 'Abonnement offert');
    assert.equal(addedListeners().length, 2);
  });

  it('propagates a settings read failure from init without publishing a translator or listener', function () {
    const failure = new Error('Locale setting unavailable');
    getLocale.throws(failure);

    assert.throws(
      () => root.init(),
      (error: unknown) => error === failure,
    );

    assert.throws(() => root.t('Gift subscription'), NOT_INITIALIZED);
    assert.deepEqual(addedListeners(), []);
  });

  it('initializes after a failed init once the locale setting is readable', function () {
    getLocale.throws(new Error('Locale setting unavailable'));
    assert.throws(() => root.init());
    getLocale.resetBehavior();
    getLocale.returns('fr');

    root.init();

    assert.equal(root.t('Gift subscription'), 'Abonnement offert');
    assert.equal(addedListeners().length, 1);
  });
});
