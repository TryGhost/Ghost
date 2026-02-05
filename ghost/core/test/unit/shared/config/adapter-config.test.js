const assert = require('node:assert/strict');
const path = require('path');
const configUtils = require('../../../utils/config-utils');

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
            assert.equal(configUtils.config.get('paths').internalAdaptersPath, path.join(configUtils.config.get('paths').corePath, '/server/adapters/'));

            assert.equal(configUtils.config.get('storage').active, 'LocalImagesStorage');
        });

        it('no effect: setting a custom active storage as string', function () {
            configUtils.set({
                storage: {
                    active: 's3',
                    s3: {}
                }
            });

            assert.equal(configUtils.config.get('storage').active, 's3');
            assert.deepEqual(configUtils.config.get('storage').s3, {});
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

            assert.deepEqual(configUtils.config.get('storage').active, {
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

            assert.deepEqual(configUtils.config.get('storage').active, {
                images: 's2',
                themes: 'local-file-store'
            });
        });
    });
});
