const assert = require('node:assert/strict');
const sinon = require('sinon');
const imageModule = require('../../../../../core/server/web/gift-preview/image');

describe('Gift Preview Image', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('generateGiftPreviewImage', function () {
        it('generates a PNG buffer', async function () {
            const result = await imageModule.generateGiftPreviewImage({
                tierName: 'Gold',
                cadenceLabel: '1 year',
                accentColor: '#FF5733'
            });

            assert.ok(Buffer.isBuffer(result));
            assert.ok(result.length > 0);

            // PNG magic bytes
            assert.equal(result[0], 0x89);
            assert.equal(result[1], 0x50); // P
            assert.equal(result[2], 0x4E); // N
            assert.equal(result[3], 0x47); // G
        });

        it('returns cached result on second call with same params', async function () {
            const params = {
                tierName: 'CacheTest',
                cadenceLabel: '1 year',
                accentColor: '#000000'
            };

            const first = await imageModule.generateGiftPreviewImage(params);
            const second = await imageModule.generateGiftPreviewImage(params);

            assert.equal(first, second, 'Should return the exact same buffer reference from cache');
        });

        it('returns different results for different params', async function () {
            const result1 = await imageModule.generateGiftPreviewImage({
                tierName: 'Gold',
                cadenceLabel: '1 year',
                accentColor: '#FF5733'
            });

            const result2 = await imageModule.generateGiftPreviewImage({
                tierName: 'Silver',
                cadenceLabel: '3 months',
                accentColor: '#333333'
            });

            assert.notEqual(result1, result2);
        });
    });
});
