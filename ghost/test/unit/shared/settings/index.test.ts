import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import sinon from 'sinon';
import type { SettingsGiven } from '../../../../shared/settings/dependencies';
import {
  enforcePublicSiteAccessLimit,
  loadSettings,
  settingsOverrides,
  startSettings,
  syncEmailSettings,
  validateSiteUuid,
} from '../../../../shared/settings/start-settings';

// The root is loaded fresh for each test: it keeps its instance for the life of the module.
function loadRoot(): typeof import('../../../../shared/settings').default {
  const file = require.resolve('../../../../shared/settings');
  delete require.cache[file];
  return require(file).default;
}

const internal = { context: { internal: true } };

/** Everything settings is given, as fakes. No module-level instance is involved. */
function given({
  config = {},
  rows = {},
  cached = {},
  publicSiteAccessDisabled = false,
}: {
  config?: Record<string, unknown>;
  rows?: Record<string, unknown>;
  cached?: Record<string, unknown>;
  publicSiteAccessDisabled?: boolean;
} = {}) {
  const calls: string[] = [];
  const attributes: Record<string, string | number> = {};
  const collection = { length: 3 };
  const store = {};
  const fields = [{ key: 'members_enabled' }];
  const events = new EventEmitter();
  const transition = {
    SettingsModel: {
      populateDefaults: sinon.spy(async () => void calls.push('populateDefaults')),
      findAll: sinon.spy(async (_options: object) => {
        calls.push('findAll');
        return collection;
      }),
      findOne: sinon.spy(async ({ key }: { key: string }) =>
        key in rows ? { get: () => rows[key] } : null,
      ),
      edit: sinon.spy(async (_settings: object[], _options: object) => void calls.push('edit')),
    },
    cache: {
      get: (key: string) => cached[key],
      init: sinon.spy((..._args: unknown[]) => void calls.push('cache.init')),
    },
    events,
    cacheStore: () => {
      calls.push('cacheStore');
      return store;
    },
    calculatedFields: () => fields,
    track: async <Result>(
      name: string,
      run: (span: { setAttribute(key: string, value: string | number): void }) => Promise<Result>,
    ) => {
      calls.push(`track ${name}`);
      return run({ setAttribute: (key, value) => void (attributes[key] = value) });
    },
    generatePrivateSiteAccessCode: () => 'amber-birch-comet',
  };
  const logging = { info: sinon.stub(), error: sinon.stub() };
  const value: SettingsGiven = {
    foundation: { config: { get: (key?: string) => config[key ?? ''] }, logging } as never,
    limits: {
      isDisabled: (name: string) => name === 'publicSiteAccess' && publicSiteAccessDisabled,
    } as never,
    'settings-transition': transition,
  };
  return {
    given: value,
    transition,
    logging,
    calls,
    attributes,
    collection,
    store,
    fields,
    events,
  };
}

describe('Settings shared module', function () {
  describe('the root', function () {
    it('is not available before the shared step starts it', function () {
      assert.throws(() => loadRoot().service, /Settings used before init\(\)/);
    });

    it('starts from what it is given and serves the cache it was handed', async function () {
      const settings = loadRoot();
      const fake = given();

      await settings.init(fake.given);

      assert.equal(settings.service, fake.transition.cache);
      sinon.assert.calledOnce(fake.transition.cache.init);
    });

    it('loads settings again on a start that follows a stop', async function () {
      const settings = loadRoot();
      const fake = given();

      await settings.init(fake.given);
      await settings.stop();
      await settings.init(fake.given);

      sinon.assert.calledTwice(fake.transition.SettingsModel.populateDefaults);
      sinon.assert.calledTwice(fake.transition.cache.init);
    });
  });

  describe('loadSettings', function () {
    it('stores defaults, applies the limit, reads everything, then builds the cache', async function () {
      const fake = given({ config: { 'hostSettings:settingsOverrides': { title: 'Forced' } } });

      await loadSettings(fake.given);

      assert.deepEqual(fake.calls, [
        'track settings.init',
        'cacheStore',
        'populateDefaults',
        'findAll',
        'cache.init',
      ]);
      sinon.assert.calledOnceWithExactly(fake.transition.SettingsModel.findAll, internal);
      sinon.assert.calledOnceWithExactly(
        fake.transition.cache.init,
        fake.events,
        fake.collection,
        fake.fields,
        fake.store,
        { title: 'Forced' },
      );
      assert.equal(fake.attributes.settings_count, 3);
      assert.equal(fake.attributes.phase, 'validate_uuid');
      assert.equal(fake.logging.info.firstCall.args[0].event.name, 'settings.init.started');
    });

    it('does not build the cache when the site belongs to another site_uuid', async function () {
      const fake = given({
        config: { site_uuid: 'aaaa' },
        cached: { site_uuid: 'bbbb' },
      });

      await assert.rejects(loadSettings(fake.given), { code: 'SITE_UUID_MISMATCH' });
    });
  });

  describe('enforcePublicSiteAccessLimit', function () {
    it('writes nothing when the host allows a public site', async function () {
      const fake = given();

      await enforcePublicSiteAccessLimit(fake.given);

      sinon.assert.notCalled(fake.transition.SettingsModel.findOne);
      sinon.assert.notCalled(fake.transition.SettingsModel.edit);
    });

    it('makes the site private and gives it an access code when the host does not', async function () {
      const fake = given({ publicSiteAccessDisabled: true, rows: { is_private: false } });

      await enforcePublicSiteAccessLimit(fake.given);

      sinon.assert.calledOnceWithExactly(
        fake.transition.SettingsModel.edit,
        [
          { key: 'is_private', value: true },
          { key: 'password', value: 'amber-birch-comet' },
        ],
        internal,
      );
    });

    it('keeps an access code the site already has', async function () {
      const fake = given({
        publicSiteAccessDisabled: true,
        rows: { is_private: true, password: 'kept' },
      });

      await enforcePublicSiteAccessLimit(fake.given);

      sinon.assert.notCalled(fake.transition.SettingsModel.edit);
    });
  });

  describe('settingsOverrides', function () {
    it('turns Transistor off when the host disables custom integrations', function () {
      const fake = given({
        config: {
          'hostSettings:settingsOverrides': { title: 'Forced', transistor: true },
          'hostSettings:limits:customIntegrations:disabled': true,
        },
      });

      assert.deepEqual(settingsOverrides(fake.given), { title: 'Forced', transistor: false });
    });

    it('is empty when the host forces nothing', function () {
      assert.deepEqual(settingsOverrides(given().given), {});
    });
  });

  describe('validateSiteUuid', function () {
    it('accepts a match in any letter case, and a missing value on either side', function () {
      validateSiteUuid(
        given({ config: { site_uuid: 'ABCD' }, cached: { site_uuid: 'abcd' } }).given,
      );
      validateSiteUuid(given({ config: { site_uuid: 'abcd' } }).given);
      validateSiteUuid(given({ cached: { site_uuid: 'abcd' } }).given);
    });

    it('logs and throws on a mismatch', function () {
      const fake = given({ config: { site_uuid: 'aaaa' }, cached: { site_uuid: 'bbbb' } });

      assert.throws(() => validateSiteUuid(fake.given), { code: 'SITE_UUID_MISMATCH' });
      sinon.assert.calledOnce(fake.logging.error);
    });
  });

  describe('syncEmailSettings', function () {
    it('clears the verification requirement once the host has verified the site', async function () {
      const fake = given({ cached: { email_verification_required: true } });

      await syncEmailSettings(fake.given, true);

      sinon.assert.calledOnceWithExactly(
        fake.transition.SettingsModel.edit,
        [{ key: 'email_verification_required', value: false }],
        internal,
      );
    });

    it('writes nothing when the host has not verified, or nothing is required', async function () {
      const required = given({ cached: { email_verification_required: true } });
      await syncEmailSettings(required.given, undefined);
      sinon.assert.notCalled(required.transition.SettingsModel.edit);

      const notRequired = given();
      await syncEmailSettings(notRequired.given, true);
      sinon.assert.notCalled(notRequired.transition.SettingsModel.edit);
    });

    it('runs after the cache is built when settings start', async function () {
      const fake = given({
        config: { 'hostSettings:emailVerification:verified': true },
        cached: { email_verification_required: true },
      });

      await startSettings(fake.given);

      assert.deepEqual(fake.calls.slice(-2), ['cache.init', 'edit']);
    });
  });
});
