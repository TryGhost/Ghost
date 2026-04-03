const sinon = require('sinon');
const assert = require('node:assert/strict');
const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const models = require('../../../../../core/server/models');
const adapterManager = require('../../../../../core/server/services/adapter-manager');

describe('UNIT: Settings Service', function () {
    let settingsService;
    let settingsCacheStub;
    let originalSettingsGetter = settingsCache.get;
    let originalLoggingError = logging.error;
    let loggingStub;

    beforeEach(async function () {
        await configUtils.restore();
        models.init();
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
            sinon.stub(models.Settings, 'populateDefaults').resolves(settingsCollection);
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
            sinon.stub(models.Settings, 'populateDefaults').resolves(settingsCollection);
            const initStub = sinon.stub(settingsCache, 'init');

            await settingsService.init();

            sinon.assert.calledOnce(initStub);
            assert.deepEqual(initStub.firstCall.args[4], {
                title: 'Custom title',
                transistor: true
            });
        });
    });
});
