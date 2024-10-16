const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');
const meta_title = require('../../../../core/frontend/helpers/meta_title');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('{{meta_title}} helper', function () {
    describe('no meta_title', function () {
        before(function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    title: 'Ghost'
                }[key];
            });
        });

        after(async function () {
            await configUtils.restore();
            sinon.restore();
        });

        it('returns correct title for homepage', function () {
            const rendered = meta_title.call(
                {},
                {data: {root: {context: ['home']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Ghost');
        });

        it('returns correct title for paginated page', function () {
            const rendered = meta_title.call(
                {},
                {data: {root: {context: [], pagination: {total: 2, page: 2}}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Ghost (Page 2)');
        });

        it('returns correct title for a post', function () {
            const rendered = meta_title.call(
                {post: {title: 'Post Title'}},
                {data: {root: {context: ['post']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Post Title');
        });

        it('returns correct title for a post with meta_title set', function () {
            const rendered = meta_title.call(
                {post: {title: 'Post Title', meta_title: 'Awesome Post'}},
                {data: {root: {context: ['post']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Awesome Post');
        });

        it('returns correct title for a page with meta_title set', function () {
            const rendered = meta_title.call(
                {post: {title: 'About Page', meta_title: 'All about my awesomeness', page: true}},
                {data: {root: {context: ['page']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('All about my awesomeness');
        });

        it('returns correct title for a tag page', function () {
            const tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};

            const rendered = meta_title.call(
                tag,
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Ghost');
        });

        it('returns correct title for a paginated tag page', function () {
            const rendered = meta_title.call(
                {tag: {name: 'Rasper Red'}},
                {data: {root: {context: ['tag', 'paged'], pagination: {total: 2, page: 2}}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Ghost (Page 2)');
        });

        it('uses tag meta_title to override default response on tag page', function () {
            const rendered = meta_title.call(
                {tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}},
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Sasper Red');
        });

        it('uses tag meta_title to override default response on paginated tag page', function () {
            const rendered = meta_title.call(
                {tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}},
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Sasper Red');
        });

        it('returns correct title for an author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Ghost');
        });

        it('returns correct title for a paginated author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author', 'paged'], pagination: {total: 2, page: 2}}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Ghost (Page 2)');
        });

        it('returns correctly escaped title of a post', function () {
            const rendered = meta_title.call(
                {post: {title: 'Post Title "</>'}},
                {data: {root: {context: ['post']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Post Title "</>');
        });

        it('returns meta_title on post when used within {{#foreach posts}}', function () {
            const rendered = meta_title.call(
                {meta_title: 'Awesome Post'},
                {data: {root: {context: ['home']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Awesome Post');
        });
    });

    describe('with meta_title', function () {
        it('returns correct title for homepage when meta_title is defined', function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    title: 'Ghost',
                    meta_title: 'Meta Title Ghost'
                }[key];
            });

            const rendered = meta_title.call(
                {},
                {data: {root: {context: ['home']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Meta Title Ghost');
        });

        it('returns correct title for paginated page', function () {
            const rendered = meta_title.call(
                {},
                {data: {root: {context: [], pagination: {total: 2, page: 2}}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Ghost (Page 2)');
        });

        it('returns correct title for a tag page', function () {
            const tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};

            const rendered = meta_title.call(
                tag,
                {data: {root: {context: ['tag']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Rasper Red - Ghost');
        });

        it('returns correct title for an author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author']}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Ghost');
        });

        it('returns correct title for a paginated author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author', 'paged'], pagination: {total: 2, page: 2}}}}
            );

            should.exist(rendered);
            String(rendered).should.equal('Donald Duck - Ghost (Page 2)');
        });
    });
});
