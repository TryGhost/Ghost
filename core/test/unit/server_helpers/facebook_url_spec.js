var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{facebook_url}} helper', function () {
    var options = {data: {blog: {}}};

    beforeEach(function () {
        options.data.blog = {facebook: ''};
    });

    it('should output the facebook url for @blog, if no other facebook username is provided', function () {
        options.data.blog = {facebook: 'hey'};

        helpers.facebook_url.call({}, options).should.equal('https://www.facebook.com/hey');
    });

    it('should output the facebook url for the local object, if it has one', function () {
        options.data.blog = {facebook: 'hey'};

        helpers.facebook_url.call({facebook: 'you/there'}, options).should.equal('https://www.facebook.com/you/there');
    });

    it('should output the facebook url for the provided username when it is explicitly passed in', function () {
        options.data.blog = {facebook: 'hey'};

        helpers.facebook_url.call({facebook: 'you/there'}, 'i/see/you/over/there', options)
            .should.equal('https://www.facebook.com/i/see/you/over/there');
    });

    it('should return null if there are no facebook usernames', function () {
        should.equal(helpers.facebook_url(options), null);
    });
});

