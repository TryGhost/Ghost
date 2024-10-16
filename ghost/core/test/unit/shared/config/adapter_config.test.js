const should = require('should');
const path = require('path');
const configUtils = require('../../../utils/configUtils');

/**
 * This is a somewhat legacy set of tests that check we get the right values for storage
 * We should rethink what the purpose of these tests is.
 */

describe('Adapter Config', function () {
    before(async function () {
        await configUtils.restore();
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    describe('Storage', function () {
        it('should default to local-file-store', function () {
            configUtils.config.get('paths').should.have.property('internalAdaptersPath', path.join(configUtils.config.get('paths').corePath, '/server/adapters/'));

            configUtils.config.get('storage').should.have.property('active', 'LocalImagesStorage');
        });

        it('no effect: setting a custom active storage as string', function () {
            configUtils.set({
                storage: {
                    active: 's3',
                    s3: {}
                }
            });

            configUtils.config.get('storage').should.have.property('active', 's3');
            configUtils.config.get('storage').should.have.property('s3', {});
        });

        it('able to set storage for themes (but not officially supported!)', function () {
            configUtils.set({
                storage: {
                    active: {
                        images: 'local-file-store',
                        themes: 's3'
                    }
                }
            });

            configUtils.config.get('storage').should.have.property('active', {
                images: 'local-file-store',
                themes: 's3'
            });
        });

        it('should allow setting a custom active storage as object', function () {
            configUtils.set({
                storage: {
                    active: {
                        images: 's2',
                        themes: 'local-file-store'
                    }
                }
            });

            configUtils.config.get('storage').should.have.property('active', {
                images: 's2',
                themes: 'local-file-store'
            });
        });
    });
});
