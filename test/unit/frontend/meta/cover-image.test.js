const should = require('should');
const getCoverImage = require('../../../../core/frontend/meta/cover-image');

describe('getCoverImage', function () {
    it('should return absolute cover image url for home', function () {
        const coverImageUrl = getCoverImage({
            context: ['home'],
            home: {
                cover_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute cover image url for author', function () {
        const coverImageUrl = getCoverImage({
            context: ['author'],
            author: {
                cover_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute image url for post', function () {
        const coverImageUrl = getCoverImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute image url for AMP post', function () {
        const coverImageUrl = getCoverImage({
            context: ['amp', 'post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return null if missing image', function () {
        const coverImageUrl = getCoverImage({
            context: ['post'],
            post: {}
        });
        should(coverImageUrl).equal(null);
    });

    it('should return null if author missing cover', function () {
        const coverImageUrl = getCoverImage({
            context: ['author'],
            author: {}
        });
        should(coverImageUrl).equal(null);
    });

    it('should return null if home missing cover', function () {
        const coverImageUrl = getCoverImage({
            context: ['home'],
            home: {}
        });
        should(coverImageUrl).equal(null);
    });
});
