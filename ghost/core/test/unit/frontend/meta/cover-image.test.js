const assert = require('node:assert/strict');
const getCoverImage = require('../../../../core/frontend/meta/cover-image');

describe('getCoverImage', function () {
    it('should return absolute cover image url for home', function () {
        const coverImageUrl = getCoverImage({
            context: ['home'],
            home: {
                cover_image: '/content/images/my-test-image.jpg'
            }
        });
        assert.notEqual(coverImageUrl, '/content/images/my-test-image.jpg');
        assert.match(coverImageUrl, /\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute cover image url for author', function () {
        const coverImageUrl = getCoverImage({
            context: ['author'],
            author: {
                cover_image: '/content/images/my-test-image.jpg'
            }
        });
        assert.notEqual(coverImageUrl, '/content/images/my-test-image.jpg');
        assert.match(coverImageUrl, /\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute image url for post', function () {
        const coverImageUrl = getCoverImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg'
            }
        });
        assert.notEqual(coverImageUrl, '/content/images/my-test-image.jpg');
        assert.match(coverImageUrl, /\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return null if missing image', function () {
        const coverImageUrl = getCoverImage({
            context: ['post'],
            post: {}
        });
        assert.equal(coverImageUrl, null);
    });

    it('should return null if author missing cover', function () {
        const coverImageUrl = getCoverImage({
            context: ['author'],
            author: {}
        });
        assert.equal(coverImageUrl, null);
    });

    it('should return null if home missing cover', function () {
        const coverImageUrl = getCoverImage({
            context: ['home'],
            home: {}
        });
        assert.equal(coverImageUrl, null);
    });

    describe('CDN image URLs', function () {
        it('should return CDN cover image url for home', function () {
            const coverImageUrl = getCoverImage({
                context: ['home'],
                home: {
                    cover_image: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/cover.jpg'
                }
            });
            assert.equal(coverImageUrl, 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/cover.jpg');
        });

        it('should return CDN cover image url for author', function () {
            const coverImageUrl = getCoverImage({
                context: ['author'],
                author: {
                    cover_image: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/author-cover.jpg'
                }
            });
            assert.equal(coverImageUrl, 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/author-cover.jpg');
        });

        it('should return CDN feature image url for post', function () {
            const coverImageUrl = getCoverImage({
                context: ['post'],
                post: {
                    feature_image: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/post-feature.jpg'
                }
            });
            assert.equal(coverImageUrl, 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/post-feature.jpg');
        });
    });
});
