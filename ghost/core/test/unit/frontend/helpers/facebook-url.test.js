const assert = require('node:assert/strict');

// Stuff we are testing
const facebook_url = require('../../../../core/frontend/helpers/facebook_url');

describe('{{facebook_url}} helper', function () {
    const options = {data: {site: {}}};

    beforeEach(function () {
        options.data.site = {facebook: ''};
    });

    it('should output the facebook url for @site, if no other facebook username is provided', function () {
        options.data.site = {facebook: 'hey'};

        assert.equal(facebook_url.call({}, options), 'https://www.facebook.com/hey');
    });

    it('should output the facebook url for the local object, if it has one', function () {
        options.data.site = {facebook: 'hey'};

        assert.equal(facebook_url.call({facebook: 'you/there'}, options), 'https://www.facebook.com/you/there');
    });

    it('should output the facebook url for the provided username when it is explicitly passed in', function () {
        options.data.site = {facebook: 'hey'};

        assert.equal(facebook_url.call({facebook: 'you/there'}, 'i/see/you/over/there', options), 'https://www.facebook.com/i/see/you/over/there');
    });

    it('should return null if there are no facebook usernames', function () {
        assert.equal(facebook_url(options), null);
    });
});
