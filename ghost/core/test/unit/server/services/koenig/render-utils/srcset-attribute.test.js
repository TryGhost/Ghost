const assert = require('node:assert/strict');
const {getSrcsetAttribute} = require('../../../../../../core/server/services/koenig/render-utils/srcset-attribute');

describe('services/koenig/render-utils/srcset-attribute', function () {
    const defaultOptions = {
        siteUrl: 'http://localhost:2368',
        imageBaseUrl: '',
        imageOptimization: {
            srcsets: true,
            contentImageSizes: {
                w600: {width: 600},
                w1000: {width: 1000},
                w1600: {width: 1600},
                w2400: {width: 2400}
            }
        },
        canTransformImage: () => true
    };

    describe('local images', function () {
        it('generates srcset for local content images', function () {
            const result = getSrcsetAttribute({
                src: '/content/images/2026/02/photo.jpg',
                width: 2000,
                options: defaultOptions
            });

            assert.ok(result);
            assert.ok(result.includes('/content/images/size/w600/2026/02/photo.jpg 600w'));
            assert.ok(result.includes('/content/images/size/w1000/2026/02/photo.jpg 1000w'));
            assert.ok(result.includes('/content/images/size/w1600/2026/02/photo.jpg 1600w'));
        });

        it('generates srcset for absolute local content images', function () {
            const result = getSrcsetAttribute({
                src: 'http://localhost:2368/content/images/2026/02/photo.jpg',
                width: 2000,
                options: defaultOptions
            });

            assert.ok(result);
            assert.ok(result.includes('http://localhost:2368/content/images/size/w600/2026/02/photo.jpg 600w'));
        });

        it('uses original src for matching width', function () {
            const result = getSrcsetAttribute({
                src: '/content/images/2026/02/photo.jpg',
                width: 1000,
                options: defaultOptions
            });

            assert.ok(result);
            assert.ok(result.includes('/content/images/2026/02/photo.jpg 1000w'));
            assert.ok(result.includes('/content/images/size/w600/2026/02/photo.jpg 600w'));
            assert.ok(!result.includes('1600w'));
        });
    });

    describe('CDN images', function () {
        const cdnOptions = {
            ...defaultOptions,
            imageBaseUrl: 'https://cdn.example.com/c/uuid'
        };

        it('generates srcset for CDN content images', function () {
            const result = getSrcsetAttribute({
                src: 'https://cdn.example.com/c/uuid/content/images/2026/02/photo.jpg',
                width: 2000,
                options: cdnOptions
            });

            assert.ok(result);
            assert.ok(result.includes('https://cdn.example.com/c/uuid/content/images/size/w600/2026/02/photo.jpg 600w'));
            assert.ok(result.includes('https://cdn.example.com/c/uuid/content/images/size/w1000/2026/02/photo.jpg 1000w'));
            assert.ok(result.includes('https://cdn.example.com/c/uuid/content/images/size/w1600/2026/02/photo.jpg 1600w'));
        });

        it('uses original CDN src for matching width', function () {
            const result = getSrcsetAttribute({
                src: 'https://cdn.example.com/c/uuid/content/images/2026/02/photo.jpg',
                width: 1000,
                options: cdnOptions
            });

            assert.ok(result);
            assert.ok(result.includes('https://cdn.example.com/c/uuid/content/images/2026/02/photo.jpg 1000w'));
            assert.ok(result.includes('https://cdn.example.com/c/uuid/content/images/size/w600/2026/02/photo.jpg 600w'));
        });

        it('does not generate srcset for external images', function () {
            const result = getSrcsetAttribute({
                src: 'https://external.com/images/photo.jpg',
                width: 2000,
                options: cdnOptions
            });

            assert.equal(result, undefined);
        });

        it('does not generate srcset for CDN image without imageBaseUrl', function () {
            const result = getSrcsetAttribute({
                src: 'https://cdn.example.com/c/uuid/content/images/2026/02/photo.jpg',
                width: 2000,
                options: defaultOptions
            });

            assert.equal(result, undefined);
        });
    });

    describe('disabled or missing options', function () {
        it('returns undefined when srcsets is false', function () {
            const result = getSrcsetAttribute({
                src: '/content/images/2026/02/photo.jpg',
                width: 2000,
                options: {
                    ...defaultOptions,
                    imageOptimization: {srcsets: false}
                }
            });

            assert.equal(result, undefined);
        });

        it('returns undefined when width is 0', function () {
            const result = getSrcsetAttribute({
                src: '/content/images/2026/02/photo.jpg',
                width: 0,
                options: defaultOptions
            });

            assert.equal(result, undefined);
        });

        it('returns undefined when canTransformImage returns false for content image', function () {
            const result = getSrcsetAttribute({
                src: '/content/images/2026/02/photo.jpg',
                width: 2000,
                options: {
                    ...defaultOptions,
                    canTransformImage: () => false
                }
            });

            assert.equal(result, undefined);
        });
    });
});
