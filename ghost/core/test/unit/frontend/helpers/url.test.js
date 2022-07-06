const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const testUtils = require('../../../utils');

const configUtils = require('../../../utils/configUtils');
const markdownToMobiledoc = require('../../../utils/fixtures/data-generator').markdownToMobiledoc;
const url = require('../../../../core/frontend/helpers/url');
const urlService = require('../../../../core/server/services/url');
const api = require('../../../../core/server/api').endpoints;

describe('{{url}} helper', function () {
    let rendered;

    beforeEach(function () {
        rendered = null;

        sinon.stub(urlService, 'getUrlByResourceId');

        sinon.stub(api.settings, 'read').callsFake(function () {
            return Promise.resolve({settings: [{value: '/:slug/'}]});
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('no subdir', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/'});
        });

        after(function () {
            configUtils.restore();
        });

        it('should return the slug with a prefix slash if the context is a post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({
                html: 'content',
                mobiledoc: markdownToMobiledoc('ff'),
                title: 'title',
                slug: 'slug',
                created_at: new Date(0),
                url: '/slug/'
            });

            urlService.getUrlByResourceId.withArgs(post.id, {absolute: undefined, withSubdirectory: true}).returns('/slug/');

            rendered = url.call(post);
            should.exist(rendered);
            rendered.string.should.equal('/slug/');
        });

        it('should output an absolute URL if the option is present', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({
                html: 'content',
                mobiledoc: markdownToMobiledoc('ff'),
                title: 'title',
                slug: 'slug',
                url: '/slug/',
                created_at: new Date(0)
            });

            urlService.getUrlByResourceId.withArgs(post.id, {absolute: true, withSubdirectory: true}).returns('http://localhost:65535/slug/');

            rendered = url.call(post, {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://localhost:65535/slug/');
        });

        it('should return the slug with a prefixed /tag/ if the context is a tag', function () {
            const tag = testUtils.DataGenerator.forKnex.createTag({
                name: 'the tag',
                slug: 'the-tag',
                description: null,
                parent: null
            });

            urlService.getUrlByResourceId.withArgs(tag.id, {absolute: undefined, withSubdirectory: true}).returns('/tag/the-tag/');

            rendered = url.call(tag);
            should.exist(rendered);
            rendered.string.should.equal('/tag/the-tag/');
        });

        it('should return the slug with a prefixed /author/ if the context is author', function () {
            const user = testUtils.DataGenerator.forKnex.createUser({
                bio: null,
                website: null,
                profile_image: null,
                location: null,
                slug: 'some-author'
            });

            urlService.getUrlByResourceId.withArgs(user.id, {absolute: undefined, withSubdirectory: true}).returns('/author/some-author/');

            rendered = url.call(user);
            should.exist(rendered);
            rendered.string.should.equal('/author/some-author/');
        });

        it('should return / if not a post or tag', function () {
            rendered = url.call({something: 'key'});
            should.exist(rendered);
            rendered.string.should.equal('/');
        });

        it('should return a relative url if passed through a nav context', function () {
            rendered = url.call(
                {url: '/foo', label: 'Foo', slug: 'foo', current: true});
            should.exist(rendered);
            rendered.string.should.equal('/foo');
        });

        it('should return an absolute url if passed through a nav context', function () {
            rendered = url.call(
                {url: '/bar', label: 'Bar', slug: 'bar', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://localhost:65535/bar');
        });

        it('external urls should be retained in a nav context', function () {
            rendered = url.call(
                {url: 'http://casper.website/baz', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://casper.website/baz');
        });

        it('should handle hosted urls in a nav context', function () {
            rendered = url.call(
                {url: 'http://localhost:65535/qux', label: 'Qux', slug: 'qux', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://localhost:65535/qux');
        });

        it('should handle hosted urls with the wrong protocol in a nav context', function () {
            rendered = url.call(
                {url: 'https://localhost:65535/quux', label: 'Quux', slug: 'quux', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://localhost:65535/quux');
        });

        it('should pass through protocol-less URLs regardless of absolute setting', function () {
            rendered = url.call(
                {url: '//casper.website/baz', label: 'Baz', slug: 'baz', current: true},
                {hash: {}});
            should.exist(rendered);
            rendered.string.should.equal('//casper.website/baz');

            rendered = url.call(
                {url: '//casper.website/baz', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('//casper.website/baz');
        });

        it('should pass through URLs with alternative schemes regardless of absolute setting', function () {
            rendered = url.call(
                {url: 'tel:01234567890', label: 'Baz', slug: 'baz', current: true},
                {hash: {}});
            should.exist(rendered);
            rendered.string.should.equal('tel:01234567890');

            rendered = url.call(
                {url: 'mailto:example@ghost.org', label: 'Baz', slug: 'baz', current: true},
                {hash: {}});
            should.exist(rendered);
            rendered.string.should.equal('mailto:example@ghost.org');

            rendered = url.call(
                {url: 'tel:01234567890', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('tel:01234567890');

            rendered = url.call(
                {url: 'mailto:example@ghost.org', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('mailto:example@ghost.org');
        });

        it('should pass through anchor-only URLs  regardless of absolute setting', function () {
            rendered = url.call(
                {url: '#thatsthegoodstuff', label: 'Baz', slug: 'baz', current: true},
                {hash: {}});
            should.exist(rendered);
            rendered.string.should.equal('#thatsthegoodstuff');

            rendered = url.call(
                {url: '#thatsthegoodstuff', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('#thatsthegoodstuff');
        });

        it('should not HTML-escape URLs', function () {
            rendered = url.call(
                {url: '/foo?foo=bar&baz=qux', label: 'Foo', slug: 'foo', current: true});
            should.exist(rendered);
            rendered.string.should.equal('/foo?foo=bar&baz=qux');
        });

        it('should encode URLs', function () {
            rendered = url.call(
                {url: '/foo?foo=bar&baz=qux&<script>alert("gotcha")</script>', label: 'Foo', slug: 'foo', current: true});
            should.exist(rendered);
            rendered.string.should.equal('/foo?foo=bar&baz=qux&%3Cscript%3Ealert(%22gotcha%22)%3C/script%3E');
        });

        it('should not double-encode URLs', function () {
            rendered = url.call(
                {url: '/?foo=space%20bar', label: 'Foo', slug: 'foo', current: true});
            should.exist(rendered);
            rendered.string.should.equal('/?foo=space%20bar');
        });

        it('should an empty string when we can\'t parse a string', function () {
            rendered = url.call({url: '/?foo=space%%bar', label: 'Baz', slug: 'baz', current: true});
            should.exist(rendered);
            rendered.string.should.equal('');
        });
    });

    describe('with subdir', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/blog'});
        });

        after(function () {
            configUtils.restore();
        });

        it('external urls should be retained in a nav context with subdir', function () {
            rendered = url.call(
                {url: 'http://casper.website/baz', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://casper.website/baz');
        });

        it('should handle subdir being set in nav context', function () {
            rendered = url.call(
                {url: '/xyzzy', label: 'xyzzy', slug: 'xyzzy', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://localhost:65535/blog/xyzzy');
        });
    });
});
