const should = require('should'),
    sinon = require('sinon'),
    urlService = require('../../../core/frontend/services/url'),
    helpers = require('../../../core/frontend/helpers'),
    models = require('../../../core/server/models'),
    testUtils = require('../../utils');

describe('{{authors}} helper', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can return string with authors', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'Michael'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'Thomas'})
        ];

        const rendered = helpers.authors.call({authors: authors}, {hash: {autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('Michael, Thomas');
    });

    it('can use a different separator', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'ghost'})
        ];

        const rendered = helpers.authors.call({authors: authors}, {hash: {separator: '|', autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('haunted|ghost');
    });

    it('can add a single prefix to multiple authors', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'ghost'})
        ];

        const rendered = helpers.authors.call({authors: authors}, {hash: {prefix: 'on ', autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('on haunted, ghost');
    });

    it('can add a single suffix to multiple authors', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'ghost'})
        ];

        const rendered = helpers.authors.call({authors: authors}, {hash: {suffix: ' forever', autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('haunted, ghost forever');
    });

    it('can add a prefix and suffix to multiple authors', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'ghost'})
        ];

        const rendered = helpers.authors.call({authors: authors}, {hash: {suffix: ' forever', prefix: 'on ', autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('on haunted, ghost forever');
    });

    it('can add a prefix and suffix with HTML', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'ghost'})
        ];

        const rendered = helpers.authors.call({authors: authors}, {hash: {suffix: ' &bull;', prefix: '&hellip; ', autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('&hellip; haunted, ghost &bull;');
    });

    it('does not add prefix or suffix if no authors exist', function () {
        const rendered = helpers.authors.call({}, {hash: {prefix: 'on ', suffix: ' forever', autolink: 'false'}});
        should.exist(rendered);

        String(rendered).should.equal('');
    });

    it('can autolink authors to author pages', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[0].id).returns('author url 1');
        urlService.getUrlByResourceId.withArgs(authors[1].id).returns('author url 2');

        const rendered = helpers.authors.call({authors: authors});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url 1">foo</a>, <a href="author url 2">bar</a>');
    });

    it('can limit no. authors output to 1', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[0].id).returns('author url 1');

        const rendered = helpers.authors.call({authors: authors}, {hash: {limit: '1'}});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url 1">foo</a>');
    });

    it('can list authors from a specified no.', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[1].id).returns('author url 2');

        const rendered = helpers.authors.call({authors: authors}, {hash: {from: '2'}});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url 2">bar</a>');
    });

    it('can list authors to a specified no.', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[0].id).returns('author url');

        const rendered = helpers.authors.call({authors: authors}, {hash: {to: '1'}});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url">foo</a>');
    });

    it('can list authors in a range', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'baz', slug: 'baz'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[1].id).returns('author url 2');
        urlService.getUrlByResourceId.withArgs(authors[2].id).returns('author url 3');

        const rendered = helpers.authors.call({authors: authors}, {hash: {from: '2', to: '3'}});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url 2">bar</a>, <a href="author url 3">baz</a>');
    });

    it('can limit no. authors and output from 2', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'baz', slug: 'baz'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[1].id).returns('author url x');

        const rendered = helpers.authors.call({authors: authors}, {hash: {from: '2', limit: '1'}});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url x">bar</a>');
    });

    it('can list authors in a range (ignore limit)', function () {
        const authors = [
            testUtils.DataGenerator.forKnex.createUser({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createUser({name: 'baz', slug: 'baz'})
        ];

        urlService.getUrlByResourceId.withArgs(authors[0].id).returns('author url a');
        urlService.getUrlByResourceId.withArgs(authors[1].id).returns('author url b');
        urlService.getUrlByResourceId.withArgs(authors[2].id).returns('author url c');

        const rendered = helpers.authors.call({authors: authors}, {hash: {from: '1', to: '3', limit: '2'}});
        should.exist(rendered);

        String(rendered).should.equal('<a href="author url a">foo</a>, <a href="author url b">bar</a>, <a href="author url c">baz</a>');
    });
});
