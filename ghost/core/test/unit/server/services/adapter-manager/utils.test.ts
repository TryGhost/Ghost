import assert from 'node:assert/strict';
import {Provider} from 'nconf'
import {
    resolveAdapterOptions,
    normalizeAdapterConfig,
    getConfiguredFeatures
} from '../../../../../core/server/services/adapter-manager/utils';
import {bindAll as bindUrlHelpers} from '@tryghost/config-url-helpers';
import {bindAll as bindHelpers} from '../../../../../core/shared/config/helpers';
import type {ConfigInstance} from '../../../../../core/shared/config/loader';

describe('Adapter Manager: utils', function () {
    describe('normalizeAdapterConfig', function () {
        // mini nconf loader to mock the config for testing
        function loadNconf(): ConfigInstance {
            const nconf = new Provider();
            nconf.use('memory');
            nconf.set('paths:contentPath', '/some/path');

            bindUrlHelpers(nconf);
            bindHelpers(nconf);

            return nconf;
        }

        it('uses top-level storage config path if adapter storage not specified', () => {
            const conf = loadNconf();
            conf.set('storage', {
                    active: 'local-storage',
                    'local-storage': {
                        basePath: '/some/path'
                    },
            });
            conf.set('adapters', {
                cache: {
                    active: 'Memory'
                },
            })

            const normalizedConfig = normalizeAdapterConfig(conf);
            assert.deepEqual(normalizedConfig.storage, {
                active: 'local-storage',
                'local-storage': {
                    basePath: '/some/path'
                },
            })
        })

        it('uses top-level scheduling config path if adapter scheduling not specified', () => {
            const conf = loadNconf();
            conf.set('scheduling', {
                active: 'some-scheduler',
                schedulerUrl: 'http://scheduler'
            });
            const normalizedConfig = normalizeAdapterConfig(conf);
            assert.deepEqual(normalizedConfig.scheduling, {
                active: 'some-scheduler',
                'some-scheduler': {
                    schedulerUrl: 'http://scheduler'
                },
            });
        });

        it('normalizes redirects config by ensuring basePath is populated from content path if not explicitly provided', () => {
            const conf = loadNconf();
            conf.set('adapters', {
                redirects: {
                    active: 'FileStore',
                    'FileStore': {
                        // basePath is not provided here
                    },
                },
            });
            const normalizedConfig = normalizeAdapterConfig(conf);
            assert.deepEqual(normalizedConfig.redirects, {
                active: 'FileStore',
                'FileStore': {
                    basePath: conf.getContentPath('data'),
                },
            });
        });

        it('normalizes route-settings config by populating both FileStore paths from config if not explicitly provided', () => {
            const conf = loadNconf();
            conf.set('paths:defaultRouteSettings', '/default/route/settings');
            conf.set('adapters', {
                'route-settings': {
                    active: 'FileStore',
                    'FileStore': {
                        // neither path is provided here
                    },
                },
            });
            const normalizedConfig = normalizeAdapterConfig(conf);
            assert.deepEqual(normalizedConfig['route-settings'], {
                active: 'FileStore',
                'FileStore': {
                    basePath: conf.getContentPath('settings'),
                    defaultSettingsBasePath: '/default/route/settings',
                },
            });
        });

        it('keeps explicitly configured route-settings FileStore paths', () => {
            const conf = loadNconf();
            conf.set('adapters', {
                'route-settings': {
                    active: 'FileStore',
                    'FileStore': {
                        basePath: '/custom/settings',
                        defaultSettingsBasePath: '/custom/defaults',
                    },
                },
            });
            const normalizedConfig = normalizeAdapterConfig(conf);
            assert.deepEqual(normalizedConfig['route-settings'], {
                active: 'FileStore',
                'FileStore': {
                    basePath: '/custom/settings',
                    defaultSettingsBasePath: '/custom/defaults',
                },
            });
        });

        it('re-resolves route-settings paths when the content path changes', () => {
            // config.get('adapters') hands back a live reference, so resolving
            // the paths in place would bake the first caller's content path in
            const conf = loadNconf();
            conf.set('adapters', {
                'route-settings': {
                    active: 'FileStore',
                    'FileStore': {},
                },
            });

            const before = normalizeAdapterConfig(conf);
            conf.set('paths:contentPath', '/elsewhere/');
            const after = normalizeAdapterConfig(conf);

            assert.equal(after['route-settings'].FileStore.basePath, conf.getContentPath('settings'));
            assert.notEqual(after['route-settings'].FileStore.basePath, before['route-settings'].FileStore.basePath);
        });
    });

    describe('resolveAdapterOptions', function () {
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

    describe('getConfiguredFeatures', function () {
        it('returns [] for missing or non-object settings', function () {
            assert.deepEqual(getConfiguredFeatures(undefined), []);
            assert.deepEqual(getConfiguredFeatures(null), []);
            assert.deepEqual(getConfiguredFeatures('local-storage'), []);
        });

        it('ignores the active key and adapter-config objects', function () {
            const settings = {
                active: 'LocalImagesStorage',
                LocalMediaStorage: {},
                LocalFilesStorage: {}
            };

            assert.deepEqual(getConfiguredFeatures(settings), []);
        });

        it('detects string-valued features', function () {
            const settings = {
                active: 'LocalImagesStorage',
                media: 'LocalMediaStorage',
                files: 'LocalFilesStorage',
                LocalMediaStorage: {},
                LocalFilesStorage: {}
            };

            assert.deepEqual(getConfiguredFeatures(settings), ['media', 'files']);
        });

        it('detects object features carrying an adapter property', function () {
            const settings = {
                Redis: {commonConfigValue: 'x'},
                images: {adapter: 'Redis', adapterConfigValue: 'y'},
                settings: {adapter: 'Redis', adapterConfigValue: 'z'}
            };

            assert.deepEqual(getConfiguredFeatures(settings), ['images', 'settings']);
        });
    });
});
