var should = require('should'),
    getCoverImage = require('../../../../server/data/meta/cover_image');

describe('getCoverImage', function () {
    it('should return absolute cover image url for home', function () {
        var coverImageUrl = getCoverImage({
            context: ['home'],
            home: {
                cover_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute cover image url for author', function () {
        var coverImageUrl = getCoverImage({
            context: ['author'],
            author: {
                cover_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute image url for post', function () {
        var coverImageUrl = getCoverImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute image url for AMP post', function () {
        var coverImageUrl = getCoverImage({
            context: ['amp', 'post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg'
            }
        });
        coverImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        coverImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return null if missing image', function () {
        var coverImageUrl = getCoverImage({
            context: ['post'],
            post: {}
        });
        should(coverImageUrl).equal(null);
    });

    it('should return null if author missing cover', function () {
        var coverImageUrl = getCoverImage({
            context: ['author'],
            author: {}
        });
        should(coverImageUrl).equal(null);
    });

    it('should return null if home missing cover', function () {
        var coverImageUrl = getCoverImage({
            context: ['home'],
            home: {}
        });
        should(coverImageUrl).equal(null);
    });
});
