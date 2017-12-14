var should = require('should'),
    social = require('../../../../server/lib/social');

describe('lib/social: urls', function () {
    it('should have a twitter url function', function () {
        should.exist(social.urls.twitter);
    });

    it('should have a facebook url function', function () {
        should.exist(social.urls.facebook);
    });

    describe('twitter', function () {
        it('should return a correct concatenated URL', function () {
            social.urls.twitter('myusername').should.eql('https://twitter.com/myusername');
        });

        it('should return a url without an @ sign if one is provided', function () {
            social.urls.twitter('@myusername').should.eql('https://twitter.com/myusername');
        });
    });

    describe('facebook', function () {
        it('should return a correct concatenated URL', function () {
            social.urls.facebook('myusername').should.eql('https://www.facebook.com/myusername');
        });

        it('should return a correct concatenated URL for usernames with slashes', function () {
            social.urls.facebook('page/xxx/123').should.eql('https://www.facebook.com/page/xxx/123');
        });

        it('should return a correct concatenated URL for usernames which start with a slash', function () {
            social.urls.facebook('/page/xxx/123').should.eql('https://www.facebook.com/page/xxx/123');
        });
    });
});
