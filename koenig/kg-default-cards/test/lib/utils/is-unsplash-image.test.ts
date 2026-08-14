import isUnsplashImage from '../../../src/utils/is-unsplash-image.js';

describe('Utils: isUnsplashImage', function () {
    it('returns true when url matches unsplash url', function () {
        expect(isUnsplashImage('https://images.unsplash.com/test')).toBe(true);
    });

    it('returns false when url does not match unsplash url', function () {
        expect(isUnsplashImage('https://images.example.com/test')).toBe(false);
    });
});
