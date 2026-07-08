import '../../utils/index.js';

import isUnsplashImage from '../../../src/utils/is-unsplash-image.js';

describe('Utils: isUnsplashImage', function () {
    it('returns true when url matches unsplash url', function () {
        isUnsplashImage('https://images.unsplash.com/test').should.be.true();
    });

    it('returns false when url does not match unsplash url', function () {
        isUnsplashImage('https://images.example.com/test').should.be.false();
    });
});
