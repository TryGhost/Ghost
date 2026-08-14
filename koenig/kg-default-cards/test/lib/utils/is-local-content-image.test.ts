import isLocalContentImage from '../../../src/utils/is-local-content-image.js';

describe('Utils: isLocalContentImage', function () {
    describe('relative url', function () {
        it('returns true for root content image path', function () {
            expect(isLocalContentImage('/content/images/test.jpg')).toBe(true);
        });

        it('returns true for subdir content image path', function () {
            expect(isLocalContentImage('/subdir/content/images/test.jpg')).toBe(true);
            expect(isLocalContentImage('/subdir/nested/content/images/test.jpg')).toBe(true);
        });

        it('returns false for non-matching content image path', function () {
            expect(isLocalContentImage('/images/test.jpg')).toBe(false);
        });
    });

    describe('absolute url', function () {
        it('returns true for local image if matching siteUrl is supplied', function () {
            expect(isLocalContentImage('https://test.com/content/images/test.jpg', 'https://test.com')).toBe(true);
        });

        it('returns true for local image if matching siteUrl is supplied with trailing slash', function () {
            expect(isLocalContentImage('https://test.com/content/images/test.jpg', 'https://test.com/')).toBe(true);
        });

        it('returns false for local image if non-matching siteUrl is supplied', function () {
            expect(isLocalContentImage('https://test.com/content/images/test.jpg', 'https://example.com')).toBe(false);
        });

        it('returns false for local image if siteUrl is not supplied', function () {
            expect(isLocalContentImage('https://test.com/content/images/test.jpg')).toBe(false);
        });
    });
});
