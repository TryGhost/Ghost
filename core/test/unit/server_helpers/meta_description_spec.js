/*globals describe, before, after, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    configUtils    = require('../../utils/configUtils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{meta_description}} helper', function () {
    before(function () {
        utils.loadHelpers();
        configUtils.set({
            theme: {
                description: 'Just a blogging platform.'
            }
        });
    });

    after(function () {
        configUtils.restore();
    });

    it('has loaded meta_description helper', function () {
        should.exist(handlebars.helpers.meta_description);
    });

    it('returns correct blog description', function () {
        var rendered = helpers.meta_description.call(
            {},
            {data: {root: {context: ['home', 'index']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('Just a blogging platform.');
    });

    it('returns empty description on paginated page', function () {
        var rendered = helpers.meta_description.call(
            {},
            {data: {root: {context: ['index', 'paged']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
    });

    it('returns empty description for a tag page', function () {
        var rendered = helpers.meta_description.call(
            {tag: {name: 'Rasper Red'}},
            {data: {root: {context: ['tag']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
    });

    it('returns empty description for a paginated tag page', function () {
        var rendered = helpers.meta_description.call(
            {tag: {name: 'Rasper Red'}},
            {data: {root: {context: ['tag', 'paged']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
    });

    it('returns tag meta_description if present for a tag page', function () {
        var rendered = helpers.meta_description.call(
            {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
            {data: {root: {context: ['tag']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('Rasper is the Cool Red Casper');
    });

    it('returns empty description on paginated tag page that has meta data', function () {
        var rendered = helpers.meta_description.call(
            {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
            {data: {root: {context: ['tag', 'paged']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
    });

    it('returns correct description for an author page', function () {
        var rendered = helpers.meta_description.call(
            {author: {bio: 'I am a Duck.'}},
            {data: {root: {context: ['author']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('I am a Duck.');
    });

    it('returns empty description for a paginated author page', function () {
        var rendered = helpers.meta_description.call(
            {author: {name: 'Donald Duck'}},
            {data: {root: {context: ['author', 'paged']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
    });

    it('returns empty description when meta_description is not set', function () {
        var rendered = helpers.meta_description.call(
            {post: {title: 'Post Title', html: 'Very nice post indeed.'}},
            {data: {root: {context: ['post']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
    });

    it('returns meta_description on post with meta_description set', function () {
        var rendered = helpers.meta_description.call(
            {post: {title: 'Post Title', meta_description: 'Nice post about stuff.'}},
            {data: {root: {context: ['post']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('Nice post about stuff.');
    });

    it('returns meta_description on post when used within {{#foreach posts}}', function () {
        var rendered = helpers.meta_description.call(
            {meta_description: 'Nice post about stuff.'},
            {data: {root: {context: ['home']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('Nice post about stuff.');
    });
});
