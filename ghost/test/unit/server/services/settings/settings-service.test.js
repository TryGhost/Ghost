const sinon = require('sinon');
const assert = require('node:assert/strict');
const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const { Settings } = require('../../../../../core/server/models/settings');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const { limitService: limits } = require('../../../../../core/server/services/limits');

describe('Settings Service', function () {
  let settingsService;
  let settingsCacheStub;
  const originalSettingsGetter = settingsCache.get;
  const originalLoggingError = logging.error;
  let loggingStub;

  beforeEach(async function () {
    await configUtils.restore();
    settingsCacheStub = sinon.stub();
    settingsCache.get = settingsCacheStub;
    loggingStub = sinon.stub();
    logging.error = loggingStub;

    // Clear the module cache to ensure we get a fresh instance
    delete require.cache[
      require.resolve('../../../../../core/server/services/settings/settings-service')
    ];

    settingsService = require('../../../../../core/server/services/settings/settings-service');
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
    settingsCache.get = originalSettingsGetter;
    logging.error = originalLoggingError;
  });

  describe('validateSiteUuid', function () {
    it('should pass when config and setting UUIDs match', function () {
      const uuid = '12345678-1234-1234-1234-123456789abc';
      configUtils.set('site_uuid', uuid);
      settingsCacheStub.withArgs('site_uuid').returns(uuid);

      // Should not throw
      settingsService.validateSiteUuid();
    });

    it('should pass when config and setting UUIDs match with different cases', function () {
      configUtils.set('site_uuid', '12345678-1234-1234-1234-123456789ABC');
      settingsCacheStub.withArgs('site_uuid').returns('12345678-1234-1234-1234-123456789abc');

      // Should not throw
      settingsService.validateSiteUuid();
    });

    it('should pass when config UUID is not set', function () {
      configUtils.set('site_uuid', null);
      settingsCacheStub.withArgs('site_uuid').returns('12345678-1234-1234-1234-123456789abc');

      // Should not throw
      settingsService.validateSiteUuid();
    });

    it('should pass when setting UUID is not set', function () {
      configUtils.set('site_uuid', '12345678-1234-1234-1234-123456789abc');
      settingsCacheStub.withArgs('site_uuid').returns(null);

      // Should not throw
      settingsService.validateSiteUuid();
    });

    it('should pass when both UUIDs are not set', function () {
      configUtils.set('site_uuid', null);
      settingsCacheStub.withArgs('site_uuid').returns(null);

      // Should not throw
      settingsService.validateSiteUuid();
    });

    it('should throw IncorrectUsageError when UUIDs do not match', function () {
      configUtils.set('site_uuid', '12345678-1234-1234-1234-123456789abc');
      settingsCacheStub.withArgs('site_uuid').returns('87654321-4321-4321-4321-cba987654321');

      try {
        settingsService.validateSiteUuid();
        assert.fail('Should have thrown IncorrectUsageError');
      } catch (error) {
        sinon.assert.calledOnce(loggingStub);
        assert.equal(error.constructor.name, 'IncorrectUsageError');
        assert.equal(error.message, 'Site UUID configuration does not match database value');
      }
    });
  });

  describe('init', function () {
    it('merges host settings overrides with transistor disabled when custom integrations are limited', async function () {
      const settingsCollection = {};
      const cacheStore = {};

      configUtils.set('hostSettings:settingsOverrides', {
        title: 'Custom title',
        transistor: true,
      });
      configUtils.set('hostSettings:limits:customIntegrations:disabled', true);

      sinon.stub(adapterManager, 'getAdapter').withArgs('cache:settings').returns(cacheStore);
      sinon.stub(Settings, 'populateDefaults').resolves();
      sinon.stub(Settings, 'findAll').resolves(settingsCollection);
      const initStub = sinon.stub(settingsCache, 'init');

      await settingsService.init();

      sinon.assert.calledOnce(initStub);
      assert.deepEqual(initStub.firstCall.args[4], {
        title: 'Custom title',
        transistor: false,
      });
    });

    it('keeps configured settings overrides unchanged when custom integrations are not limited', async function () {
      const settingsCollection = {};
      const cacheStore = {};

      configUtils.set('hostSettings:settingsOverrides', {
        title: 'Custom title',
        transistor: true,
      });

      sinon.stub(adapterManager, 'getAdapter').withArgs('cache:settings').returns(cacheStore);
      sinon.stub(Settings, 'populateDefaults').resolves();
      sinon.stub(Settings, 'findAll').resolves(settingsCollection);
      const initStub = sinon.stub(settingsCache, 'init');

      await settingsService.init();

      sinon.assert.calledOnce(initStub);
      assert.deepEqual(initStub.firstCall.args[4], {
        title: 'Custom title',
        transistor: true,
      });
    });
  });

  describe('initialization metrics', function () {
    let now;
    let metric;
    let started;
    let adapter;
    let populate;
    let enforce;
    let read;
    let calculate;
    let rebuild;
    let validate;
    const collection = { length: 42 };
    const store = {};
    const fields = [];
    const shipped = () =>
      new Promise((resolve) => {
        setImmediate(resolve);
      });

    beforeEach(function () {
      now = 0;
      sinon.stub(performance, 'now').callsFake(() => now);
      metric = sinon.stub(metrics, 'metric').resolves();
      started = sinon.stub(logging, 'info');
      adapter = sinon.stub(adapterManager, 'getAdapter').callsFake(() => {
        now += 3;
        return store;
      });
      populate = sinon.stub(Settings, 'populateDefaults').callsFake(async () => {
        now += 10;
      });
      enforce = sinon.stub(settingsService, 'enforcePublicSiteAccessLimit').callsFake(async () => {
        now += 5;
      });
      read = sinon.stub(Settings, 'findAll').callsFake(async () => {
        now += 40;
        return collection;
      });
      calculate = sinon.stub(settingsService, 'getCalculatedFields').callsFake(() => {
        now += 7;
        return fields;
      });
      rebuild = sinon.stub(settingsCache, 'init').callsFake(() => {
        now += 13;
      });
      validate = sinon.stub(settingsService, 'validateSiteUuid').callsFake(() => {
        now += 2;
      });
    });

    it('separates boot preparation from read and calculated-field cache rebuilding', async function () {
      assert.equal(await settingsService.init(), undefined);
      await shipped();

      sinon.assert.callOrder(
        started,
        adapter,
        populate,
        enforce,
        read,
        calculate,
        rebuild,
        validate,
      );
      sinon.assert.calledOnceWithExactly(read, { context: { internal: true } });
      assert.equal(rebuild.firstCall.args[1], collection);
      assert.equal(rebuild.firstCall.args[2], fields);
      assert.equal(rebuild.firstCall.args[3], store);
      sinon.assert.calledOnce(metric);
      const [name, document] = metric.firstCall.args;
      assert.equal(name, 'ghost-spans');
      assert.deepEqual(document.event, {
        name: 'settings.init',
        outcome: 'success',
        duration: 80 * 1e6,
      });
      assert.deepEqual(document.numeric_labels, {
        preparation_ms: 18,
        find_all_ms: 40,
        cache_rebuild_ms: 20,
        reload_ms: 60,
        settings_count: 42,
      });
      assert.equal(started.firstCall.args[0].event.name, 'settings.init.started');
    });

    it('does not emit completion or rebuild the cache while the DB read is pending', async function () {
      let finishRead;
      read.callsFake(
        () =>
          new Promise((resolve) => {
            finishRead = resolve;
          }),
      );
      const pending = settingsService.init();
      await shipped();
      sinon.assert.calledOnce(started);
      sinon.assert.notCalled(metric);
      sinon.assert.notCalled(rebuild);

      now += 5000;
      finishRead(collection);
      await pending;
      await shipped();
      assert.equal(metric.firstCall.args[1].numeric_labels.find_all_ms, 5000);
      assert.equal(metric.firstCall.args[1].numeric_labels.reload_ms, 5020);
    });

    for (const phase of [
      'adapter',
      'populate_defaults',
      'enforce_access_limit',
      'find_all',
      'cache_rebuild',
      'validate_uuid',
    ]) {
      it(`records the ${phase} failure and rethrows the original error`, async function () {
        const failure = Object.assign(new Error('private failure details'), {
          code: 'TEST_FAILURE',
        });
        const steps = {
          adapter,
          populate_defaults: populate,
          enforce_access_limit: enforce,
          find_all: read,
          cache_rebuild: rebuild,
          validate_uuid: validate,
        };
        steps[phase].callsFake(() => {
          now += 100;
          throw failure;
        });

        await assert.rejects(settingsService.init(), (err) => err === failure);
        await shipped();
        sinon.assert.calledOnce(metric);
        const document = metric.firstCall.args[1];
        assert.equal(document.event.outcome, 'failure');
        assert.ok(document.event.duration >= 100 * 1e6);
        assert.equal(document.labels.phase, phase);
        assert.deepEqual(document.error, { type: 'TEST_FAILURE' });
        assert.equal(JSON.stringify(document).includes('private failure details'), false);
        assert.equal(loggingStub.firstCall.args[0].event.name, 'settings.init.exception');
        assert.equal(loggingStub.firstCall.args[0].err, failure);
        if (phase !== 'validate_uuid') {
          assert.equal(document.numeric_labels.reload_ms, undefined);
        }
      });
    }
  });

  describe('publicSiteAccess enforcement', function () {
    function fakeSettingRow(value) {
      return { get: () => value };
    }

    beforeEach(function () {
      sinon.stub(adapterManager, 'getAdapter').withArgs('cache:settings').returns({});
      sinon.stub(settingsCache, 'init');
      sinon.stub(Settings, 'populateDefaults').resolves();
      sinon.stub(Settings, 'findAll').resolves({});
    });

    it('is a no-op when the limit is not disabled', async function () {
      sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(false);
      const editStub = sinon.stub(Settings, 'edit').resolves();

      await settingsService.init();

      sinon.assert.notCalled(editStub);
    });

    it('persists is_private = true and a generated access code when both are missing', async function () {
      sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
      const findOneStub = sinon.stub(Settings, 'findOne');
      findOneStub.withArgs({ key: 'is_private' }).resolves(fakeSettingRow(false));
      findOneStub.withArgs({ key: 'password' }).resolves(fakeSettingRow(''));
      const editStub = sinon.stub(Settings, 'edit').resolves();

      await settingsService.init();

      sinon.assert.calledOnce(editStub);
      const writes = editStub.firstCall.args[0];
      const writesByKey = Object.fromEntries(writes.map((w) => [w.key, w.value]));
      assert.equal(writesByKey.is_private, true);
      assert.match(writesByKey.password, /^[a-z]+\d{3}$/);
      assert.deepEqual(editStub.firstCall.args[1], { context: { internal: true } });
    });

    it('only writes the missing values when one is already enforced', async function () {
      sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
      const findOneStub = sinon.stub(Settings, 'findOne');
      findOneStub.withArgs({ key: 'is_private' }).resolves(fakeSettingRow(true));
      findOneStub.withArgs({ key: 'password' }).resolves(fakeSettingRow(''));
      const editStub = sinon.stub(Settings, 'edit').resolves();

      await settingsService.init();

      const writes = editStub.firstCall.args[0];
      assert.equal(writes.length, 1);
      assert.equal(writes[0].key, 'password');
    });

    it('does not write when both values are already enforced', async function () {
      sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
      const findOneStub = sinon.stub(Settings, 'findOne');
      findOneStub.withArgs({ key: 'is_private' }).resolves(fakeSettingRow(true));
      findOneStub.withArgs({ key: 'password' }).resolves(fakeSettingRow('anchor042'));
      const editStub = sinon.stub(Settings, 'edit').resolves();

      await settingsService.init();

      sinon.assert.notCalled(editStub);
    });

    it('treats a whitespace-only access code as missing', async function () {
      sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
      const findOneStub = sinon.stub(Settings, 'findOne');
      findOneStub.withArgs({ key: 'is_private' }).resolves(fakeSettingRow(true));
      findOneStub.withArgs({ key: 'password' }).resolves(fakeSettingRow('   '));
      const editStub = sinon.stub(Settings, 'edit').resolves();

      await settingsService.init();

      const writes = editStub.firstCall.args[0];
      assert.equal(writes.length, 1);
      assert.equal(writes[0].key, 'password');
    });
  });
});
