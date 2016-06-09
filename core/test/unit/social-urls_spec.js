var should = require('should'),

    // Stuff we are testing
    socialUrls = require('../../server/utils/social-urls');

describe('Social Urls', function () {
    it('should have a twitter url function', function () {
        should.exist(socialUrls.twitterUrl);
    });

    it('should have a facebook url function', function () {
        should.exist(socialUrls.facebookUrl);
    });

    describe('twitter', function () {
        it('should return a correct concatenated URL', function () {
            socialUrls.twitterUrl('myusername').should.eql('https://twitter.com/myusername');
        });

        it('should return a url without an @ sign if one is provided', function () {
            socialUrls.twitterUrl('@myusername').should.eql('https://twitter.com/myusername');
        });
    });

    describe('facebook', function () {
        it('should return a correct concatenated URL', function () {
            socialUrls.facebookUrl('myusername').should.eql('https://www.facebook.com/myusername');
        });

        it('should return a correct concatenated URL for usernames with slashes', function () {
            socialUrls.facebookUrl('page/xxx/123').should.eql('https://www.facebook.com/page/xxx/123');
        });

        it('should return a correct concatenated URL for usernames which start with a slash', function () {
            socialUrls.facebookUrl('/page/xxx/123').should.eql('https://www.facebook.com/page/xxx/123');
        });
    });
});
