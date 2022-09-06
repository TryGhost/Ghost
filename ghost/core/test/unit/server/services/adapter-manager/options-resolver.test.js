const should = require('should');

const resolveAdapterOptions = require('../../../../../core/server/services/adapter-manager/options-resolver');

describe('Adapter Manager: options resolver', function () {
    it('creates empty configs for unknown adapter with a default (active) instance', function () {
        const name = 'cache:images';

        const adapterServiceConfig = {
            cache: {
                active: 'Memory'
            }
        };

        const {adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterName.should.equal('Memory');
        should.equal(adapterConfig, undefined);
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

        const {adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterName.should.equal('cloud-storage');
        adapterConfig.should.deepEqual({
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

        const {adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterName.should.equal('local-storage');
        adapterConfig.should.deepEqual({
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

        const {adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterName.should.equal('cloud-storage');
        adapterConfig.should.deepEqual({
            custom: 'configValue'
        });
    });

    it('combines configurations from shared adapter and feature adapter instances', function () {
        const primaryAdapterName = 'cache:images';
        const secondaryAdapterName = 'cache:settings';
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

        const {adapterName, adapterConfig} = resolveAdapterOptions(primaryAdapterName, adapterServiceConfig);

        adapterName.should.equal('Redis');
        adapterConfig.should.deepEqual({
            commonConfigValue: 'common_config_value',
            adapterConfigValue: 'images_redis_value'
        });

        const {adapterName: secondAdapterName, adapterConfig: secondAdapterConfig} = resolveAdapterOptions(secondaryAdapterName, adapterServiceConfig);

        secondAdapterName.should.equal('Redis');
        secondAdapterConfig.should.deepEqual({
            commonConfigValue: 'common_config_value',
            adapterConfigValue: 'settings_redis_value'
        });
    });

    it('combines empty configuration from shared adapter and feature adapter instances', function () {
        const primaryAdapterName = 'cache:images';
        const secondaryAdapterName = 'cache:settings';
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

        const {adapterName, adapterConfig} = resolveAdapterOptions(primaryAdapterName, adapterServiceConfig);

        adapterName.should.equal('Redis');
        adapterConfig.should.deepEqual({
            adapterConfigValue: 'images_redis_value'
        });

        const {adapterName: secondAdapterName, adapterConfig: secondAdapterConfig} = resolveAdapterOptions(secondaryAdapterName, adapterServiceConfig);

        secondAdapterName.should.equal('Redis');
        secondAdapterConfig.should.deepEqual({
            adapterConfigValue: 'settings_redis_value'
        });
    });

    it('gives priority to a feature config over a common adapter config', function () {
        const primaryAdapterName = 'cache:images';
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

        const {adapterName, adapterConfig} = resolveAdapterOptions(primaryAdapterName, adapterServiceConfig);

        adapterName.should.equal('Redis');
        adapterConfig.should.deepEqual({
            commonConfigValue: 'common_config_value',
            adapterConfigValue: 'images_redis_value',
            overrideMe: 'images_override'
        });
    });
});
