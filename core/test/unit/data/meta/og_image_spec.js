const should = require('should');
const sinon = require('sinon');
const getOgImage = require('../../../../frontend/meta/og_image');
const settingsCache = require('../../../../server/services/settings/cache');

describe('getOgImage', function () {
    describe('[home]', function () {
        it('should return null if [home] context and no og_image set', function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    og_image: null
                }[key];
            });

            var ogImageUrl = getOgImage({
                context: ['home'],
                home: {}
            });
            should(ogImageUrl).equal(null);

            sinon.restore();
        });

        it('should return image URL if [home] context and og_image set', function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    og_image: '/content/images/home-og.jpg'
                }[key];
            });

            var ogImageUrl = getOgImage({
                context: ['home'],
                home: {}
            });
            ogImageUrl.should.not.equal('/content/images/home-og.jpg');
            ogImageUrl.should.match(/\/content\/images\/home-og\.jpg$/);

            sinon.restore();
        });
    });

    it('[home] should return null if not post context [home] and no og_image set', function () {
        var ogImageUrl = getOgImage({
            context: ['home'],
            home: {}
        });
        should(ogImageUrl).equal(null);
    });

    it('should return null if not post context [author]', function () {
        var ogImageUrl = getOgImage({
            context: ['author'],
            author: {}
        });
        should(ogImageUrl).equal(null);
    });

    it('should return null if not post context [tag]', function () {
        var ogImageUrl = getOgImage({
            context: ['tag'],
            author: {}
        });
        should(ogImageUrl).equal(null);
    });

    it('should return absolute url for OG image in post context', function () {
        var ogImageUrl = getOgImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                og_image: '/content/images/my-special-og-image.jpg'
            }
        });
        ogImageUrl.should.not.equal('/content/images/my-special-og-image.jpg');
        ogImageUrl.should.match(/\/content\/images\/my-special-og-image\.jpg$/);
    });

    it('should return absolute url for feature image in post context', function () {
        var ogImageUrl = getOgImage({
            context: ['post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                og_image: ''
            }
        });
        ogImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        ogImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return absolute url for OG image in AMP context', function () {
        var ogImageUrl = getOgImage({
            context: ['amp', 'post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                og_image: '/content/images/my-special-og-image.jpg'
            }
        });
        ogImageUrl.should.not.equal('/content/images/my-special-og-image.jpg');
        ogImageUrl.should.match(/\/content\/images\/my-special-og-image\.jpg$/);
    });

    it('should return absolute url for feature image in AMP context', function () {
        var ogImageUrl = getOgImage({
            context: ['amp', 'post'],
            post: {
                feature_image: '/content/images/my-test-image.jpg',
                og_image: ''
            }
        });
        ogImageUrl.should.not.equal('/content/images/my-test-image.jpg');
        ogImageUrl.should.match(/\/content\/images\/my-test-image\.jpg$/);
    });

    it('should return null if missing image', function () {
        var ogImageUrl = getOgImage({
            context: ['post'],
            post: {}
        });
        should(ogImageUrl).equal(null);
    });
});
