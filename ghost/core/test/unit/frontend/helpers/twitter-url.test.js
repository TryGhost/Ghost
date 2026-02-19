const assert = require('node:assert/strict');

// Stuff we are testing
const twitter_url = require('../../../../core/frontend/helpers/twitter_url');

describe('{{twitter_url}} helper', function () {
    const options = {data: {site: {}}};

    beforeEach(function () {
        options.data.site = {twitter: ''};
    });

    it('should output the twitter url for @site, if no other twitter username is provided', function () {
        options.data.site = {twitter: '@hey'};

        assert.equal(twitter_url.call({}, options), 'https://x.com/hey');
    });

    it('should output the twitter url for the local object, if it has one', function () {
        options.data.site = {twitter: '@hey'};

        assert.equal(twitter_url.call({twitter: '@youthere'}, options), 'https://x.com/youthere');
    });

    it('should output the twitter url for the provided username when it is explicitly passed in', function () {
        options.data.site = {twitter: '@hey'};

        assert.equal(twitter_url.call({twitter: '@youthere'}, '@iseeyouoverthere', options), 'https://x.com/iseeyouoverthere');
    });

    it('should return null if there are no twitter usernames', function () {
        assert.equal(twitter_url(options), null);
    });
});
