const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sinon = require('sinon');
const imageModule = require('../../../../../core/server/web/gift-preview/image');

const giftPreviewPath = path.dirname(require.resolve('../../../../../core/server/web/gift-preview/image'));

describe('Gift Preview Image', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('generateGiftPreviewImage', function () {
        it('bundles the Inter font for gift preview text rendering', function () {
            assert.ok(fs.existsSync(path.join(giftPreviewPath, 'Inter.ttf')));
        });

        it('bundles the card noise texture for gift preview image rendering', function () {
            assert.ok(fs.existsSync(path.join(giftPreviewPath, 'gift-card-noise.png')));
        });

        it('generates a PNG buffer', async function () {
            const result = await imageModule.generateGiftPreviewImage({
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
                accentColor: '#000000'
            };

            const first = await imageModule.generateGiftPreviewImage(params);
            const second = await imageModule.generateGiftPreviewImage(params);

            assert.equal(first, second, 'Should return the exact same buffer reference from cache');
        });

        it('returns different results for different gift details with the same accent color', async function () {
            const result1 = await imageModule.generateGiftPreviewImage({
                tierLabel: 'Gold membership',
                cadenceLabel: '1 year',
                siteTitle: 'Test Blog',
                accentColor: '#FF5733'
            });

            const result2 = await imageModule.generateGiftPreviewImage({
                tierLabel: 'Silver membership',
                cadenceLabel: '3 months',
                siteTitle: 'Test Blog',
                accentColor: '#FF5733'
            });

            assert.notEqual(result1, result2);
        });

        it('returns different results for different accent colors', async function () {
            const result1 = await imageModule.generateGiftPreviewImage({
                accentColor: '#FF5733'
            });

            const result2 = await imageModule.generateGiftPreviewImage({
                accentColor: '#333333'
            });

            assert.notEqual(result1, result2);
        });
    });
});
