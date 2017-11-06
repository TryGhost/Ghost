// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var should = require('should'), // jshint ignore:line
    _ = require('lodash'),
    hbs = require.main.require('core/server/themes/engine'),

    // Stuff we are testing
    helpers = require.main.require('core/server/helpers');

describe('Helpers', function () {
    var hbsHelpers = ['each', 'if', 'unless', 'with', 'helperMissing', 'blockHelperMissing', 'log', 'lookup'],
        ghostHelpers = [
            'asset', 'author', 'body_class', 'content', 'date', 'encode', 'excerpt', 'facebook_url', 'foreach', 'get',
            'ghost_foot', 'ghost_head', 'has', 'img_url', 'is', 'meta_description', 'meta_title', 'navigation',
            'next_post', 'page_url', 'pagination', 'plural', 'post_class', 'prev_post', 'reading_time', 'tags', 'title', 'twitter_url',
            'url'
        ],
        expectedHelpers = _.concat(hbsHelpers, ghostHelpers);

    describe('Load Core Helpers', function () {
        before(function () {
            helpers.loadCoreHelpers();
        });

        // This will work when we finish refactoring
        it('should have exactly the right helpers', function () {
            var foundHelpers, missingHelpers, unexpectedHelpers;

            foundHelpers = _.keys(hbs.handlebars.helpers);

            missingHelpers = _.difference(expectedHelpers, foundHelpers);
            unexpectedHelpers = _.difference(foundHelpers, expectedHelpers);

            missingHelpers.should.be.an.Array().with.lengthOf(0);
            unexpectedHelpers.should.be.an.Array().with.lengthOf(0);
        });
    });
});
