const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const urlService = require('../../../../core/server/services/url');
const models = require('../../../../core/server/models');
const tagsHelper = require('../../../../core/frontend/helpers/tags');

describe('{{tags}} helper', function () {
    let urlServiceGetUrlByResourceIdStub;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        urlServiceGetUrlByResourceIdStub = sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can return string with tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), 'foo, bar');
    });

    it('can use a different separator', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {separator: '|', autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), 'haunted|ghost');
    });

    it('can add a single prefix to multiple tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {prefix: 'on ', autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), 'on haunted, ghost');
    });

    it('can add a single suffix to multiple tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {suffix: ' forever', autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), 'haunted, ghost forever');
    });

    it('can add a prefix and suffix to multiple tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {suffix: ' forever', prefix: 'on ', autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), 'on haunted, ghost forever');
    });

    it('can add a prefix and suffix with HTML', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {suffix: ' &bull;', prefix: '&hellip; ', autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), '&hellip; haunted, ghost &bull;');
    });

    it('does not add prefix or suffix if no tags exist', function () {
        const rendered = tagsHelper.call({}, {hash: {prefix: 'on ', suffix: ' forever', autolink: 'false'}});
        assertExists(rendered);

        assert.equal(String(rendered), '');
    });

    it('can autolink tags to tag pages', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[0].id).returns('tag url 1');
        urlServiceGetUrlByResourceIdStub.withArgs(tags[1].id).returns('tag url 2');

        const rendered = tagsHelper.call({tags: tags});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url 1">foo</a>, <a href="tag url 2">bar</a>');
    });

    it('can limit no. tags output to 1', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[0].id).returns('tag url 1');

        const rendered = tagsHelper.call({tags: tags}, {hash: {limit: '1'}});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url 1">foo</a>');
    });

    it('can list tags from a specified no.', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[1].id).returns('tag url 2');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2'}});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url 2">bar</a>');
    });

    it('can list tags to a specified no.', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[0].id).returns('tag url x');

        const rendered = tagsHelper.call({tags: tags}, {hash: {to: '1'}});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url x">foo</a>');
    });

    it('can list tags in a range', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[1].id).returns('tag url b');
        urlServiceGetUrlByResourceIdStub.withArgs(tags[2].id).returns('tag url c');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', to: '3'}});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url b">bar</a>, <a href="tag url c">baz</a>');
    });

    it('can limit no. tags and output from 2', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[1].id).returns('tag url b');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', limit: '1'}});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url b">bar</a>');
    });

    it('can list tags in a range (ignore limit)', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'})
        ];

        urlServiceGetUrlByResourceIdStub.withArgs(tags[0].id).returns('tag url a');
        urlServiceGetUrlByResourceIdStub.withArgs(tags[1].id).returns('tag url b');
        urlServiceGetUrlByResourceIdStub.withArgs(tags[2].id).returns('tag url c');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '1', to: '3', limit: '2'}});
        assertExists(rendered);

        assert.equal(String(rendered), '<a href="tag url a">foo</a>, <a href="tag url b">bar</a>, <a href="tag url c">baz</a>');
    });

    describe('Internal tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: '#bar', slug: 'hash-bar', visibility: 'internal'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'buzz', slug: 'buzz'})
        ];

        const tags1 = [
            testUtils.DataGenerator.forKnex.createTag({name: '#foo', slug: 'hash-foo-bar', visibility: 'internal'}),
            testUtils.DataGenerator.forKnex.createTag({name: '#bar', slug: 'hash-bar', visibility: 'internal'})
        ];

        beforeEach(function () {
            urlServiceGetUrlByResourceIdStub.withArgs(tags[0].id).returns('1');
            urlServiceGetUrlByResourceIdStub.withArgs(tags[1].id).returns('2');
            urlServiceGetUrlByResourceIdStub.withArgs(tags[2].id).returns('3');
            urlServiceGetUrlByResourceIdStub.withArgs(tags[3].id).returns('4');
            urlServiceGetUrlByResourceIdStub.withArgs(tags[4].id).returns('5');
        });

        it('will not output internal tags by default', function () {
            const rendered = tagsHelper.call({tags: tags});

            assert.equal(String(rendered), '<a href="1">foo</a>, ' +
            '<a href="3">bar</a>, ' +
            '<a href="4">baz</a>, ' +
            '<a href="5">buzz</a>');
        });

        it('should still correctly apply from & limit tags', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', limit: '2'}});

            assert.equal(String(rendered), '<a href="3">bar</a>, ' +
            '<a href="4">baz</a>');
        });

        it('should output all tags with visibility="all"', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {visibility: 'all'}});

            assert.equal(String(rendered), '<a href="1">foo</a>, ' +
            '<a href="2">#bar</a>, ' +
            '<a href="3">bar</a>, ' +
            '<a href="4">baz</a>, ' +
            '<a href="5">buzz</a>');
        });

        it('should output all tags with visibility property set with visibility="public,internal"', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {visibility: 'public,internal'}});
            assertExists(rendered);

            assert.equal(String(rendered), '<a href="1">foo</a>, ' +
            '<a href="2">#bar</a>, ' +
            '<a href="3">bar</a>, ' +
            '<a href="4">baz</a>, ' +
            '<a href="5">buzz</a>');
        });

        it('Should output only internal tags with visibility="internal"', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {visibility: 'internal'}});
            assertExists(rendered);

            assert.equal(String(rendered), '<a href="2">#bar</a>');
        });

        it('should output nothing if all tags are internal', function () {
            const rendered = tagsHelper.call({tags: tags1}, {hash: {prefix: 'stuff'}});
            assertExists(rendered);

            assert.equal(String(rendered), '');
        });
    });
});
