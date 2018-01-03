var should = require('should'),
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),
    helpers = require('../../../server/helpers'),
    settingsCache = require('../../../server/services/settings/cache'),

    sandbox = sinon.sandbox.create();

describe('{{meta_description}} helper', function () {
    before(function () {
        sandbox.stub(settingsCache, 'get').returns('The professional publishing platform');
    });

    after(function () {
        configUtils.restore();
        sandbox.restore();
    });

    it('returns correct blog description', function () {
        var rendered = helpers.meta_description.call(
            {},
            {data: {root: {context: ['home', 'index']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('The professional publishing platform');
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

    it('returns empty description for an author page', function () {
        var rendered = helpers.meta_description.call(
            {author: {bio: 'I am a Duck.'}},
            {data: {root: {context: ['author']}}}
        );

        should.exist(rendered);
        String(rendered).should.equal('');
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
