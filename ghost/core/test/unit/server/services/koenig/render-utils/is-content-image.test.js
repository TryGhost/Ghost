const assert = require('node:assert/strict');
const {isLocalContentImage, isContentImage} = require('../../../../../../core/server/services/koenig/render-utils/is-content-image');

describe('services/koenig/render-utils/is-content-image', function () {
    describe('isLocalContentImage', function () {
        it('returns true for relative content image paths', function () {
            assert.ok(isLocalContentImage('/content/images/2024/01/photo.jpg'));
        });

        it('returns true for relative content image paths with subdirectory', function () {
            assert.ok(isLocalContentImage('/blog/content/images/2024/01/photo.jpg'));
        });

        it('returns true for __GHOST_URL__ prefixed paths', function () {
            assert.ok(isLocalContentImage('__GHOST_URL__/content/images/2024/01/photo.jpg'));
        });

        it('returns true for absolute URLs matching siteUrl', function () {
            assert.ok(isLocalContentImage('https://example.com/content/images/2024/01/photo.jpg', 'https://example.com'));
        });

        it('returns true for absolute URLs matching siteUrl with trailing slash', function () {
            assert.ok(isLocalContentImage('https://example.com/content/images/2024/01/photo.jpg', 'https://example.com/'));
        });

        it('returns false for external image URLs', function () {
            assert.ok(!isLocalContentImage('https://external.com/images/photo.jpg'));
        });

        it('returns false for CDN image URLs', function () {
            assert.ok(!isLocalContentImage('https://cdn.example.com/c/uuid/content/images/2024/01/photo.jpg'));
        });

        it('returns false for Unsplash images', function () {
            assert.ok(!isLocalContentImage('https://images.unsplash.com/photo-abc123'));
        });
    });

    describe('isContentImage', function () {
        it('returns true for local content images (delegates to isLocalContentImage)', function () {
            assert.ok(isContentImage('/content/images/2024/01/photo.jpg'));
        });

        it('returns true for __GHOST_URL__ prefixed paths', function () {
            assert.ok(isContentImage('__GHOST_URL__/content/images/2024/01/photo.jpg', '', ''));
        });

        it('returns true for absolute URLs matching siteUrl', function () {
            assert.ok(isContentImage('https://example.com/content/images/2024/01/photo.jpg', 'https://example.com'));
        });

        it('returns true for CDN image URLs when imageBaseUrl is configured', function () {
            assert.ok(isContentImage(
                'https://cdn.example.com/c/uuid/content/images/2024/01/photo.jpg',
                'https://example.com',
                'https://cdn.example.com/c/uuid'
            ));
        });

        it('returns true for CDN image URLs with trailing slash in imageBaseUrl', function () {
            assert.ok(isContentImage(
                'https://cdn.example.com/c/uuid/content/images/2024/01/photo.jpg',
                'https://example.com',
                'https://cdn.example.com/c/uuid/'
            ));
        });

        it('returns false for CDN image URLs when imageBaseUrl is not configured', function () {
            assert.ok(!isContentImage(
                'https://cdn.example.com/c/uuid/content/images/2024/01/photo.jpg',
                'https://example.com',
                ''
            ));
        });

        it('returns false for external image URLs', function () {
            assert.ok(!isContentImage(
                'https://external.com/images/photo.jpg',
                'https://example.com',
                'https://cdn.example.com/c/uuid'
            ));
        });

        it('returns false for Unsplash images', function () {
            assert.ok(!isContentImage(
                'https://images.unsplash.com/photo-abc123',
                'https://example.com',
                'https://cdn.example.com/c/uuid'
            ));
        });

        it('returns false for CDN URL without content/images path', function () {
            assert.ok(!isContentImage(
                'https://cdn.example.com/c/uuid/other/path/photo.jpg',
                'https://example.com',
                'https://cdn.example.com/c/uuid'
            ));
        });

        it('returns false when imageBaseUrl does not match the URL', function () {
            assert.ok(!isContentImage(
                'https://other-cdn.example.com/content/images/2024/01/photo.jpg',
                'https://example.com',
                'https://cdn.example.com/c/uuid'
            ));
        });

        it('handles missing siteUrl and imageBaseUrl gracefully', function () {
            assert.ok(isContentImage('/content/images/2024/01/photo.jpg'));
            assert.ok(!isContentImage('https://cdn.example.com/content/images/2024/01/photo.jpg'));
        });
    });
});
