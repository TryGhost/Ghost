const should = require('should');
const sinon = require('sinon');
const meta_description = require('../../../../core/frontend/helpers/meta_description');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('{{meta_description}} helper', function () {
    const localSettingsCache = {};

    before(function () {
        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });
    });

    after(function () {
        sinon.restore();
    });

    describe('no meta_description', function () {
        before(function () {
            localSettingsCache.description = 'The professional publishing platform';
        });

        it('returns correct site description', function () {
            const rendered = meta_description.call(
                {},
                {data: {root: {context: ['home', 'index']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('The professional publishing platform');
        });

        it('returns empty description on paginated page', function () {
            const rendered = meta_description.call(
                {},
                {data: {root: {context: ['index', 'paged']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('');
        });

        it('returns empty description for a tag page', function () {
            const rendered = meta_description.call(
                {tag: {name: 'Rasper Red'}},
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('');
        });

        it('returns empty description for a paginated tag page', function () {
            const rendered = meta_description.call(
                {tag: {name: 'Rasper Red'}},
                {data: {root: {context: ['tag', 'paged']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('');
        });

        it('returns tag meta_description if present for a tag page', function () {
            const rendered = meta_description.call(
                {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Rasper is the Cool Red Casper');
        });

        it('returns empty description on paginated tag page that has meta data', function () {
            const rendered = meta_description.call(
                {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
                {data: {root: {context: ['tag', 'paged']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('');
        });

        it('returns author bio for an author page', function () {
            const rendered = meta_description.call(
                {author: {bio: 'I am a Duck.'}},
                {data: {root: {context: ['author']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('I am a Duck.');
        });

        it('returns empty description for a paginated author page', function () {
            const rendered = meta_description.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author', 'paged']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('');
        });

        it('returns empty description when meta_description is not set', function () {
            const rendered = meta_description.call(
                {post: {title: 'Post Title', html: 'Very nice post indeed.'}},
                {data: {root: {context: ['post']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('');
        });

        it('returns meta_description on post with meta_description set', function () {
            const rendered = meta_description.call(
                {post: {title: 'Post Title', meta_description: 'Nice post about stuff.'}},
                {data: {root: {context: ['post']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Nice post about stuff.');
        });

        it('returns meta_description on post when used within {{#foreach posts}}', function () {
            const rendered = meta_description.call(
                {meta_description: 'Nice post about stuff.'},
                {data: {root: {context: ['home']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Nice post about stuff.');
        });
    });

    describe('with meta_description', function () {
        before(function () {
            localSettingsCache.meta_description = 'Meta description of the professional publishing platform';
        });

        it('returns correct site description', function () {
            const rendered = meta_description.call(
                {},
                {data: {root: {context: ['home', 'index']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Meta description of the professional publishing platform');
        });

        it('returns tag meta_description if present for a tag page', function () {
            const rendered = meta_description.call(
                {tag: {name: 'Rasper Red', meta_description: 'Rasper is the Cool Red Casper'}},
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Rasper is the Cool Red Casper');
        });
    });
});
