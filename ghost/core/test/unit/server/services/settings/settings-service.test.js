const sinon = require('sinon');
const assert = require('node:assert/strict');
const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const {Settings} = require('../../../../../core/server/models/settings');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const limits = require('../../../../../core/server/services/limits');

describe('UNIT: Settings Service', function () {
    let settingsService;
    let settingsCacheStub;
    let originalSettingsGetter = settingsCache.get;
    let originalLoggingError = logging.error;
    let loggingStub;

    beforeEach(async function () {
        await configUtils.restore();
        settingsCacheStub = sinon.stub();
        settingsCache.get = settingsCacheStub;
        loggingStub = sinon.stub();
        logging.error = loggingStub;

        // Clear the module cache to ensure we get a fresh instance
        delete require.cache[require.resolve('../../../../../core/server/services/settings/settings-service')];

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
                transistor: true
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
                transistor: false
            });
        });

        it('keeps configured settings overrides unchanged when custom integrations are not limited', async function () {
            const settingsCollection = {};
            const cacheStore = {};

            configUtils.set('hostSettings:settingsOverrides', {
                title: 'Custom title',
                transistor: true
            });

            sinon.stub(adapterManager, 'getAdapter').withArgs('cache:settings').returns(cacheStore);
            sinon.stub(Settings, 'populateDefaults').resolves();
            sinon.stub(Settings, 'findAll').resolves(settingsCollection);
            const initStub = sinon.stub(settingsCache, 'init');

            await settingsService.init();

            sinon.assert.calledOnce(initStub);
            assert.deepEqual(initStub.firstCall.args[4], {
                title: 'Custom title',
                transistor: true
            });
        });
    });

    describe('publicSiteAccess enforcement', function () {
        function fakeSettingRow(value) {
            return {get: () => value};
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
            findOneStub.withArgs({key: 'is_private'}).resolves(fakeSettingRow(false));
            findOneStub.withArgs({key: 'password'}).resolves(fakeSettingRow(''));
            const editStub = sinon.stub(Settings, 'edit').resolves();

            await settingsService.init();

            sinon.assert.calledOnce(editStub);
            const writes = editStub.firstCall.args[0];
            const writesByKey = Object.fromEntries(writes.map(w => [w.key, w.value]));
            assert.equal(writesByKey.is_private, true);
            assert.match(writesByKey.password, /^[a-z]+\d{3}$/);
            assert.deepEqual(editStub.firstCall.args[1], {context: {internal: true}});
        });

        it('only writes the missing values when one is already enforced', async function () {
            sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
            const findOneStub = sinon.stub(Settings, 'findOne');
            findOneStub.withArgs({key: 'is_private'}).resolves(fakeSettingRow(true));
            findOneStub.withArgs({key: 'password'}).resolves(fakeSettingRow(''));
            const editStub = sinon.stub(Settings, 'edit').resolves();

            await settingsService.init();

            const writes = editStub.firstCall.args[0];
            assert.equal(writes.length, 1);
            assert.equal(writes[0].key, 'password');
        });

        it('does not write when both values are already enforced', async function () {
            sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
            const findOneStub = sinon.stub(Settings, 'findOne');
            findOneStub.withArgs({key: 'is_private'}).resolves(fakeSettingRow(true));
            findOneStub.withArgs({key: 'password'}).resolves(fakeSettingRow('anchor042'));
            const editStub = sinon.stub(Settings, 'edit').resolves();

            await settingsService.init();

            sinon.assert.notCalled(editStub);
        });

        it('treats a whitespace-only access code as missing', async function () {
            sinon.stub(limits, 'isDisabled').withArgs('publicSiteAccess').returns(true);
            const findOneStub = sinon.stub(Settings, 'findOne');
            findOneStub.withArgs({key: 'is_private'}).resolves(fakeSettingRow(true));
            findOneStub.withArgs({key: 'password'}).resolves(fakeSettingRow('   '));
            const editStub = sinon.stub(Settings, 'edit').resolves();

            await settingsService.init();

            const writes = editStub.firstCall.args[0];
            assert.equal(writes.length, 1);
            assert.equal(writes[0].key, 'password');
        });
    });
});
