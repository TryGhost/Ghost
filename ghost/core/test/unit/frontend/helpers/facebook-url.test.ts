import assert from 'node:assert/strict';
// @ts-expect-error facebook_url currently lacks type definitions.
import facebookUrl from '../../../../core/frontend/helpers/facebook_url';

describe('{{facebook_url}} helper', function () {
    const options: {data: {site: {facebook?: string}}} = {data: {site: {}}};

    beforeEach(function () {
        options.data.site = {facebook: ''};
    });

    it('should output the facebook url for @site, if no other facebook username is provided', function () {
        options.data.site = {facebook: 'hey'};

        assert.equal(facebookUrl.call({}, options), 'https://www.facebook.com/hey');
    });

    it('should output the facebook url for the local object, if it has one', function () {
        options.data.site = {facebook: 'hey'};

        assert.equal(facebookUrl.call({facebook: 'you/there'}, options), 'https://www.facebook.com/you/there');
    });

    it('should output the facebook url for the provided username when it is explicitly passed in', function () {
        options.data.site = {facebook: 'hey'};

        assert.equal(facebookUrl.call({facebook: 'you/there'}, 'i/see/you/over/there', options), 'https://www.facebook.com/i/see/you/over/there');
    });

    it('should return null if there are no facebook usernames', function () {
        assert.equal(facebookUrl(options), null);
    });
});
