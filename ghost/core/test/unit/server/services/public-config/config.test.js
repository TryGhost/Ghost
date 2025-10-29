const assert = require('assert/strict');
const configUtils = require('../../../../utils/configUtils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const getConfigProperties = require('../../../../../core/server/services/public-config/config');
const sinon = require('sinon');

// List of allowed keys to be returned by the public-config service
// This is kind of a duplicate of the keys in the config.js output serializer in the api-framework
// However the list of keys returned by the public-config service can differ based on flags and config set, so we want to keep this explicit

const allowedKeys = [
    'version',
    'environment',
    'database',
    'mail',
    'useGravatar',
    'labs',
    'clientExtensions',
    'enableDeveloperExperiments',
    'stripeDirect',
    'mailgunIsConfigured',
    'emailAnalytics',
    'hostSettings',
    'tenor',
    'pintura',
    'signupForm',
    'security'
];

describe('Public-config Service', function () {
    describe('Config Properties', function () {
        beforeEach(async function () {
            sinon.stub(settingsCache, 'get')
                .withArgs('site_uuid')
                .returns('931ade9e-a4f1-4217-8625-34bd34250c16');
        });
        afterEach(async function () {
            await configUtils.restore();
            sinon.restore();
        });

        it('should return the correct default config properties', function () {
            const configProperties = getConfigProperties();

            assert.deepEqual(Object.keys(configProperties), allowedKeys);
        });

        it('should return null for tenor apikey when unset', function () {
            let configProperties = getConfigProperties();

            assert.equal(configProperties.tenor.googleApiKey, null);
        });

        it('should return tenor apikey when set', function () {
            configUtils.set('tenor:googleApiKey', 'TENOR_KEY');

            let configProperties = getConfigProperties();

            assert.equal(configProperties.tenor.googleApiKey, 'TENOR_KEY');
        });

        it('should return true for mailgunIsConfigured when mailgun is configured', function () {
            configUtils.set('bulkEmail', {
                mailgun: 'exists'
            });

            let configProperties = getConfigProperties();

            assert.equal(configProperties.mailgunIsConfigured, true);
        });

        it('should return false for mailgunIsConfigured when mailgun is not configured', function () {
            configUtils.set('bulkEmail', {});

            let configProperties = getConfigProperties();

            assert.equal(configProperties.mailgunIsConfigured, false);
        });

        it('should NOT return stats by default', function () {
            let configProperties = getConfigProperties();

            assert.equal(configProperties.stats, undefined);
        });

        it('should return stats when tinybird config is set with the stats key', function () {
            configUtils.set('tinybird', {
                stats: {
                    endpoint: 'xxx'
                }
            });

            let configProperties = getConfigProperties();

            assert.deepEqual(configProperties.stats, {endpoint: 'xxx', id: '931ade9e-a4f1-4217-8625-34bd34250c16'});
        });

        it('should return stats id when tinybird config is set with the id key', function () {
            configUtils.set('tinybird', {
                stats: {
                    id: '1234567890'
                }
            });

            let configProperties = getConfigProperties();

            assert.deepEqual(configProperties.stats.id, '1234567890');
        });

        it('should NOT return stats when tinybird config is set without the stats key', function () {
            configUtils.set('tinybird', {
                url: 'xxx'
            });

            let configProperties = getConfigProperties();

            assert.equal(configProperties.stats, undefined);
        });

        it('should return emailAnalytics as boolean from nested config structure', function () {
            // Default config has emailAnalytics.enabled = true
            let configProperties = getConfigProperties();

            assert.equal(configProperties.emailAnalytics, true);
            assert.equal(typeof configProperties.emailAnalytics, 'boolean');
        });

        it('should return false for emailAnalytics when disabled', function () {
            configUtils.set('emailAnalytics:enabled', false);

            let configProperties = getConfigProperties();

            assert.equal(configProperties.emailAnalytics, false);
        });
    });
});
