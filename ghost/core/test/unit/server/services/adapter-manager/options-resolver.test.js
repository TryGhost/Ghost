const assert = require('node:assert/strict');

const resolveAdapterOptions = require('../../../../../core/server/services/adapter-manager/options-resolver');

describe('Adapter Manager: options resolver', function () {
    it('creates empty configs for unknown adapter with a default (active) instance', function () {
        const name = 'cache:images';

        const adapterServiceConfig = {
            cache: {
                active: 'Memory'
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        assert.equal(adapterClassName, 'Memory');
        assert.equal(adapterConfig, undefined);
    });

    it('returns default adapter configuration', function () {
        const name = 'storage';
        const adapterServiceConfig = {
            storage: {
                active: 'cloud-storage',
                'cloud-storage': {
                    custom: 'configValue'
                }
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        assert.equal(adapterClassName, 'cloud-storage');
        assert.deepEqual(adapterConfig, {
            custom: 'configValue'
        });
    });

    it('returns adapter configuration based on specified feature', function () {
        const name = 'storage:media';
        const adapterServiceConfig = {
            storage: {
                active: 'cloud-storage',
                media: 'local-storage',
                'cloud-storage': {
                    custom: 'configValue'
                },
                'local-storage': {
                    custom: 'localStorageConfig'
                }
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        assert.equal(adapterClassName, 'local-storage');
        assert.deepEqual(adapterConfig, {
            custom: 'localStorageConfig'
        });
    });

    it('returns active configuration if piece of feature adapter is missing', function () {
        const name = 'storage:media';
        const adapterServiceConfig = {
            storage: {
                active: 'cloud-storage',
                media: 'local-storage',
                'cloud-storage': {
                    custom: 'configValue'
                }
                // when you forget to configure local-storage!
                // 'local-storage': {
                //     custom: 'localStorageConfig'
                // }
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        assert.equal(adapterClassName, 'cloud-storage');
        assert.deepEqual(adapterConfig, {
            custom: 'configValue'
        });
    });

    it('combines configurations from shared adapter and feature adapter instances', function () {
        const primaryadapterClassName = 'cache:images';
        const secondaryadapterClassName = 'cache:settings';
        const adapterServiceConfig = {
            cache: {
                Redis: {
                    commonConfigValue: 'common_config_value'
                },
                images: {
                    adapter: 'Redis',
                    adapterConfigValue: 'images_redis_value'
                },
                settings: {
                    adapter: 'Redis',
                    adapterConfigValue: 'settings_redis_value'
                }
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(primaryadapterClassName, adapterServiceConfig);

        assert.equal(adapterClassName, 'Redis');
        assert.deepEqual(adapterConfig, {
            commonConfigValue: 'common_config_value',
            adapterConfigValue: 'images_redis_value'
        });

        const {adapterClassName: secondadapterClassName, adapterConfig: secondAdapterConfig} = resolveAdapterOptions(secondaryadapterClassName, adapterServiceConfig);

        assert.equal(secondadapterClassName, 'Redis');
        assert.deepEqual(secondAdapterConfig, {
            commonConfigValue: 'common_config_value',
            adapterConfigValue: 'settings_redis_value'
        });
    });

    it('combines empty configuration from shared adapter and feature adapter instances', function () {
        const primaryadapterClassName = 'cache:images';
        const secondaryadapterClassName = 'cache:settings';
        const adapterServiceConfig = {
            cache: {
                images: {
                    adapter: 'Redis',
                    adapterConfigValue: 'images_redis_value'
                },
                settings: {
                    adapter: 'Redis',
                    adapterConfigValue: 'settings_redis_value'
                }
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(primaryadapterClassName, adapterServiceConfig);

        assert.equal(adapterClassName, 'Redis');
        assert.deepEqual(adapterConfig, {
            adapterConfigValue: 'images_redis_value'
        });

        const {adapterClassName: secondadapterClassName, adapterConfig: secondAdapterConfig} = resolveAdapterOptions(secondaryadapterClassName, adapterServiceConfig);

        assert.equal(secondadapterClassName, 'Redis');
        assert.deepEqual(secondAdapterConfig, {
            adapterConfigValue: 'settings_redis_value'
        });
    });

    it('gives priority to a feature config over a common adapter config', function () {
        const primaryadapterClassName = 'cache:images';
        const adapterServiceConfig = {
            cache: {
                Redis: {
                    commonConfigValue: 'common_config_value',
                    overrideMe: 'common_value'
                },
                images: {
                    adapter: 'Redis',
                    adapterConfigValue: 'images_redis_value',
                    overrideMe: 'images_override'
                }
            }
        };

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(primaryadapterClassName, adapterServiceConfig);

        assert.equal(adapterClassName, 'Redis');
        assert.deepEqual(adapterConfig, {
            commonConfigValue: 'common_config_value',
            adapterConfigValue: 'images_redis_value',
            overrideMe: 'images_override'
        });
    });
});
