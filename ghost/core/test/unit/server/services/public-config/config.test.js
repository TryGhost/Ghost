const assert = require('assert/strict');
const configUtils = require('../../../../utils/configUtils');
const getConfigProperties = require('../../../../../core/server/services/public-config/config');

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
    'signupForm'
];

describe('Public-config Service', function () {
    describe('Config Properties', function () {
        afterEach(async function () {
            await configUtils.restore();
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
    });
});
