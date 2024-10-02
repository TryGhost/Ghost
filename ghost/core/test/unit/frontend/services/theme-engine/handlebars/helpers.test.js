const should = require('should');
const _ = require('lodash');
const hbs = require('../../../../../../core/frontend/services/theme-engine/engine');

// Stuff we are testing
const helpers = require('../../../../../../core/frontend/services/helpers');

describe('Helpers', function () {
    const hbsHelpers = ['each', 'if', 'unless', 'with', 'helperMissing', 'blockHelperMissing', 'log', 'lookup', 'block', 'contentFor'];
    const ghostHelpers = [
        'asset', 'authors', 'body_class', 'cancel_link', 'concat', 'content', 'content_api_key', 'date', 'encode', 'excerpt', 'facebook_url', 'foreach', 'get',
        'ghost_foot', 'ghost_head', 'has', 'img_url', 'is', 'link', 'link_class', 'meta_description', 'meta_title', 'navigation',
        'next_post', 'page_url', 'pagination', 'plural', 'post_class', 'prev_post', 'price', 'raw', 'reading_time', 't', 'tags', 'title','total_members', 'total_paid_members', 'twitter_url',
        'url', 'comment_count', 'collection', 'recommendations', 'readable_url'
    ];
    const experimentalHelpers = ['match', 'tiers', 'comments', 'search'];

    const expectedHelpers = _.concat(hbsHelpers, ghostHelpers, experimentalHelpers);

    describe('Load Core Helpers', function () {
        before(function () {
            hbs.express4();
            helpers.init();
        });

        // This will work when we finish refactoring
        it('should have exactly the right helpers', function () {
            const foundHelpers = _.keys(hbs.handlebars.helpers);
            const missingHelpers = _.difference(expectedHelpers, foundHelpers);
            const unexpectedHelpers = _.difference(foundHelpers, expectedHelpers);

            missingHelpers.should.be.an.Array().with.lengthOf(0);
            unexpectedHelpers.should.be.an.Array().with.lengthOf(0);
        });
    });
});
