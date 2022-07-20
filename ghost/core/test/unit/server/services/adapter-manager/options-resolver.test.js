const should = require('should');

const resolveAdapterOptions = require('../../../../../core/server/services/adapter-manager/options-resolver');

describe('Adapter Manager: options resolver', function () {
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

        const {adapterType, adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterType.should.equal('storage');
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

        const {adapterType, adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterType.should.equal('storage');
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

        const {adapterType, adapterName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        adapterType.should.equal('storage');
        adapterName.should.equal('cloud-storage');
        adapterConfig.should.deepEqual({
            custom: 'configValue'
        });
    });
});
