const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const configUtils = require('../../../utils/config-utils');
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

            assertExists(rendered);
            assert.equal(String(rendered), 'Ghost');
        });

        it('returns correct title for paginated page', function () {
            const rendered = meta_title.call(
                {},
                {data: {root: {context: [], pagination: {total: 2, page: 2}}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Ghost (Page 2)');
        });

        it('returns correct title for a post', function () {
            const rendered = meta_title.call(
                {post: {title: 'Post Title'}},
                {data: {root: {context: ['post']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Post Title');
        });

        it('returns correct title for a post with meta_title set', function () {
            const rendered = meta_title.call(
                {post: {title: 'Post Title', meta_title: 'Awesome Post'}},
                {data: {root: {context: ['post']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Awesome Post');
        });

        it('returns correct title for a page with meta_title set', function () {
            const rendered = meta_title.call(
                {post: {title: 'About Page', meta_title: 'All about my awesomeness', page: true}},
                {data: {root: {context: ['page']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'All about my awesomeness');
        });

        it('returns correct title for a tag page', function () {
            const tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};

            const rendered = meta_title.call(
                tag,
                {data: {root: {context: ['tag']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Rasper Red - Ghost');
        });

        it('returns correct title for a paginated tag page', function () {
            const rendered = meta_title.call(
                {tag: {name: 'Rasper Red'}},
                {data: {root: {context: ['tag', 'paged'], pagination: {total: 2, page: 2}}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Rasper Red - Ghost (Page 2)');
        });

        it('uses tag meta_title to override default response on tag page', function () {
            const rendered = meta_title.call(
                {tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}},
                {data: {root: {context: ['tag']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Sasper Red');
        });

        it('uses tag meta_title to override default response on paginated tag page', function () {
            const rendered = meta_title.call(
                {tag: {name: 'Rasper Red', meta_title: 'Sasper Red'}},
                {data: {root: {context: ['tag']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Sasper Red');
        });

        it('returns correct title for an author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Donald Duck - Ghost');
        });

        it('returns correct title for a paginated author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author', 'paged'], pagination: {total: 2, page: 2}}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Donald Duck - Ghost (Page 2)');
        });

        it('returns correctly escaped title of a post', function () {
            const rendered = meta_title.call(
                {post: {title: 'Post Title "</>'}},
                {data: {root: {context: ['post']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Post Title "</>');
        });

        it('returns meta_title on post when used within {{#foreach posts}}', function () {
            const rendered = meta_title.call(
                {meta_title: 'Awesome Post'},
                {data: {root: {context: ['home']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Awesome Post');
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

            assertExists(rendered);
            assert.equal(String(rendered), 'Meta Title Ghost');
        });

        it('returns correct title for paginated page', function () {
            const rendered = meta_title.call(
                {},
                {data: {root: {context: [], pagination: {total: 2, page: 2}}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Ghost (Page 2)');
        });

        it('returns correct title for a tag page', function () {
            const tag = {relativeUrl: '/tag/rasper-red', tag: {name: 'Rasper Red'}};

            const rendered = meta_title.call(
                tag,
                {data: {root: {context: ['tag']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Rasper Red - Ghost');
        });

        it('returns correct title for an author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author']}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Donald Duck - Ghost');
        });

        it('returns correct title for a paginated author page', function () {
            const rendered = meta_title.call(
                {author: {name: 'Donald Duck'}},
                {data: {root: {context: ['author', 'paged'], pagination: {total: 2, page: 2}}}}
            );

            assertExists(rendered);
            assert.equal(String(rendered), 'Donald Duck - Ghost (Page 2)');
        });
    });
});
