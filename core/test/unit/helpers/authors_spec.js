var should = require('should'),
    sinon = require('sinon'),
    helpers = require('../../../server/helpers'),
    models = require('../../../server/models'),
    sandbox = sinon.sandbox.create();

describe('{{authors}} helper', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('can return string with authors', function () {
        var authors = [{name: 'Michael'}, {name: 'Thomas'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {autolink: 'false'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('Michael, Thomas');
    });

    it('can use a different separator', function () {
        var authors = [{name: 'haunted'}, {name: 'ghost'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {separator: '|', autolink: 'false'}}
            );

        should.exist(rendered);

        String(rendered).should.equal('haunted|ghost');
    });

    it('can add a single prefix to multiple authors', function () {
        var authors = [{name: 'haunted'}, {name: 'ghost'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {prefix: 'on ', autolink: 'false'}}
            );

        should.exist(rendered);

        String(rendered).should.equal('on haunted, ghost');
    });

    it('can add a single suffix to multiple authors', function () {
        var authors = [{name: 'haunted'}, {name: 'ghost'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {suffix: ' forever', autolink: 'false'}}
            );

        should.exist(rendered);

        String(rendered).should.equal('haunted, ghost forever');
    });

    it('can add a prefix and suffix to multiple authors', function () {
        var authors = [{name: 'haunted'}, {name: 'ghost'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {suffix: ' forever', prefix: 'on ', autolink: 'false'}}
            );

        should.exist(rendered);

        String(rendered).should.equal('on haunted, ghost forever');
    });

    it('can add a prefix and suffix with HTML', function () {
        var authors = [{name: 'haunted'}, {name: 'ghost'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {suffix: ' &bull;', prefix: '&hellip; ', autolink: 'false'}}
            );

        should.exist(rendered);

        String(rendered).should.equal('&hellip; haunted, ghost &bull;');
    });

    it('does not add prefix or suffix if no authors exist', function () {
        var rendered = helpers.authors.call(
            {},
            {hash: {prefix: 'on ', suffix: ' forever', autolink: 'false'}}
        );

        should.exist(rendered);

        String(rendered).should.equal('');
    });

    it('can autolink authors to author pages', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}],
            rendered = helpers.authors.call(
                {authors: authors}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/foo-bar/">foo</a>, <a href="/author/bar/">bar</a>');
    });

    it('can limit no. authors output to 1', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {limit: '1'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/foo-bar/">foo</a>');
    });

    it('can list authors from a specified no.', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {from: '2'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/bar/">bar</a>');
    });

    it('can list authors to a specified no.', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {to: '1'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/foo-bar/">foo</a>');
    });

    it('can list authors in a range', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}, {name: 'baz', slug: 'baz'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {from: '2', to: '3'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/bar/">bar</a>, <a href="/author/baz/">baz</a>');
    });

    it('can limit no. authors and output from 2', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}, {name: 'baz', slug: 'baz'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {from: '2', limit: '1'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/bar/">bar</a>');
    });

    it('can list authors in a range (ignore limit)', function () {
        var authors = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}, {name: 'baz', slug: 'baz'}],
            rendered = helpers.authors.call(
                {authors: authors},
                {hash: {from: '1', to: '3', limit: '2'}}
            );
        should.exist(rendered);

        String(rendered).should.equal('<a href="/author/foo-bar/">foo</a>, <a href="/author/bar/">bar</a>, <a href="/author/baz/">baz</a>');
    });
});
