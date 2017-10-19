var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{twitter_url}} helper', function () {
    var options = {data: {blog: {}}};

    beforeEach(function () {
        options.data.blog = {twitter: ''};
    });

    it('should output the twitter url for @blog, if no other twitter username is provided', function () {
        options.data.blog = {twitter: '@hey'};

        helpers.twitter_url.call({}, options).should.equal('https://twitter.com/hey');
    });

    it('should output the twitter url for the local object, if it has one', function () {
        options.data.blog = {twitter: '@hey'};

        helpers.twitter_url.call({twitter: '@youthere'}, options).should.equal('https://twitter.com/youthere');
    });

    it('should output the twitter url for the provided username when it is explicitly passed in', function () {
        options.data.blog = {twitter: '@hey'};

        helpers.twitter_url.call({twitter: '@youthere'}, '@iseeyouoverthere', options)
            .should.equal('https://twitter.com/iseeyouoverthere');
    });

    it('should return null if there are no twitter usernames', function () {
        should.equal(helpers.twitter_url(options), null);
    });
});

