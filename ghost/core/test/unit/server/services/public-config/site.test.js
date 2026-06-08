const assert = require('node:assert/strict');
const configUtils = require('../../../../utils/config-utils');
const getSiteProperties = require('../../../../../core/server/services/public-config/site');

describe('Public-config Service', function () {
    describe('Site Properties', function () {
        describe('Sentry', function () {
            const fakeDSN = 'https://aaabbbccc000111222333444555667@sentry.io/1234567';

            afterEach(async function () {
                await configUtils.restore();
            });

            it('should not include sentry properties if sentry disabled via config', function () {
                configUtils.set({
                    client_sentry: {
                        disabled: true
                    }
                });

                const siteProperties = getSiteProperties();

                assert.equal(siteProperties.sentry_dsn, undefined);
                assert.equal(siteProperties.sentry_env, undefined);
            });

            it('should not include sentry properties if sentry not present in config', function () {
                const siteProperties = getSiteProperties();

                assert.equal(siteProperties.sentry_dsn, undefined);
                assert.equal(siteProperties.sentry_env, undefined);
            });

            it('should include sentry properties if sentry not disabled in config', function () {
                configUtils.set({
                    client_sentry: {
                        disabled: false,
                        dsn: fakeDSN
                    }
                });

                const siteProperties = getSiteProperties();

                assert.equal(siteProperties.sentry_dsn, fakeDSN);
                assert.equal(siteProperties.sentry_env, 'testing'); // testing is the default env
            });

            it('should use PRO_ENV env var for sentry_env property if in config', function () {
                const env = 'staging';

                configUtils.set({
                    client_sentry: {
                        disabled: false,
                        dsn: fakeDSN
                    },
                    PRO_ENV: env
                });

                const siteProperties = getSiteProperties();

                assert.equal(siteProperties.sentry_dsn, fakeDSN);
                assert.equal(siteProperties.sentry_env, env);
            });
        });
    });
});
