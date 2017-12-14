var should = require('should'),
    getTwitterImage = require('../../../../server/data/meta/twitter_image');

describe('getTwitterImage', function () {
    it('[home] should return null if not post context [home]', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['home'],
            home: {}
        });
        should(twitterImageUrl).equal(null);
    });

    it('should return null if not post context [author]', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['author'],
            author: {}
        });
        should(twitterImageUrl).equal(null);
    });

    it('should return null if not post context [tag]', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['tag'],
            author: {}
        });
        should(twitterImageUrl).equal(null);
    });

    it('should return absolute url for Twitter image in post context', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                twitter_image: '/content/images/my-special-twitter-image.jpg'
            }
        });
        twitterImageUrl.should.not.equal('/content/images/my-special-twitter-image.jpg');
        twitterImageUrl.should.match(/\/content\/images\/my-special-twitter-image\.jpg$/);
    });

    it('should return absolute url for feature image in post context', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                twitter_image: ''
            }
        });
        twitterImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        twitterImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute url for Twitter image in AMP context', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['amp', 'post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                twitter_image: '/content/images/my-special-twitter-image.jpg'
            }
        });
        twitterImageUrl.should.not.equal('/content/images/my-special-twitter-image.jpg');
        twitterImageUrl.should.match(/\/content\/images\/my-special-twitter-image\.jpg$/);
    });

    it('should return absolute url for feature image in AMP context', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['amp', 'post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                twitter_image: ''
            }
        });
        twitterImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        twitterImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return null if missing image', function () {
        var twitterImageUrl = getTwitterImage({
            context: ['post'],
            post: {}
        });
        should(twitterImageUrl).equal(null);
    });
});
