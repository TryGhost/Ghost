const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const urlUtils = require('../../../../core/shared/url-utils');
const urlService = require('../../../../core/server/services/url');
const getUrl = require('../../../../core/frontend/meta/url');
const testUtils = require('../../../utils');

describe('getUrl', function () {
    let urlServiceGetUrlForResourceStub;
    let urlUtilsUrlForStub;
    let urlUtilsAbsoluteToRelativeStub;

    beforeEach(function () {
        urlServiceGetUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');
        urlUtilsUrlForStub = sinon.stub(urlUtils, 'urlFor');
        urlUtilsAbsoluteToRelativeStub = sinon.stub(urlUtils, 'absoluteToRelative');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('posts carrying a serializer-attached url', function () {
        it('reads the url property instead of asking the URL service', function () {
            const post = testUtils.DataGenerator.forKnex.createPost();
            delete post.status;
            post.url = 'http://my-site.com/my-post/';

            urlUtilsAbsoluteToRelativeStub.withArgs('http://my-site.com/my-post/').returns('/my-post/');

            assert.equal(getUrl(post), '/my-post/');
            sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
        });

        it('returns the url property as-is for absolute requests', function () {
            const post = testUtils.DataGenerator.forKnex.createPost();
            delete post.status;
            post.url = 'http://my-site.com/my-post/';

            assert.equal(getUrl(post, true), 'http://my-site.com/my-post/');
            sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
        });

        it('returns the preview URL for the /404/ sentinel without asking the URL service', function () {
            // The serializer computed /404/ from the full model — re-asking the
            // service with the (stripped) render-time object can't do better.
            const post = testUtils.DataGenerator.forKnex.createPost();
            delete post.status;
            post.url = 'http://my-site.com/404/';

            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined).returns('preview url');

            assert.equal(getUrl(post), 'preview url');
            sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
        });

        it('returns the /404/ url itself for an explicitly published post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'published'});
            post.url = 'http://my-site.com/404/';

            urlUtilsAbsoluteToRelativeStub.withArgs('http://my-site.com/404/').returns('/404/');

            assert.equal(getUrl(post), '/404/');
            sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
        });
    });

    it('should return url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.id, type: 'posts'}), {absolute: undefined, withSubdirectory: true})
            .returns('post url');

        assert.equal(getUrl(post), 'post url');
    });

    describe('canary log for posts without a serializer-attached url', function () {
        let loggingWarnStub;

        beforeEach(function () {
            loggingWarnStub = sinon.stub(logging, 'warn');
        });

        it('warns when a post falls back to the URL service', function () {
            const post = testUtils.DataGenerator.forKnex.createPost();
            urlServiceGetUrlForResourceStub.returns('/my-post/');

            getUrl(post);

            sinon.assert.calledOnce(loggingWarnStub);
            const report = loggingWarnStub.firstCall.args[0];
            assert.equal(report.code, 'URL_HELPER_MISSING_URL');
            assert.equal(report.errorDetails.id, post.id);
            assert.ok(report.errorDetails.resourceKeys.includes('slug'));
            assert.match(report.stack, /url\.test\.js/);
        });

        it('does not warn when the post carries a url', function () {
            const post = testUtils.DataGenerator.forKnex.createPost();
            post.url = 'http://my-site.com/my-post/';
            urlUtilsAbsoluteToRelativeStub.returns('/my-post/');

            getUrl(post);

            sinon.assert.notCalled(loggingWarnStub);
        });
    });

    describe('Content-API-serialized posts (status stripped by the serializer)', function () {
        it('defaults status to published so the lazy URL service can evaluate its base filter', function () {
            const post = testUtils.DataGenerator.forKnex.createPost();
            // The Content API output serializer deletes `status` (everything it
            // serves is published) — theme-rendered posts arrive here without it.
            delete post.status;

            urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.id, type: 'posts', status: 'published'}))
                .returns('post url');

            assert.equal(getUrl(post), 'post url');
            // Every call (including the /p/:uuid fallback probe, which still
            // runs for status-stripped posts) carries the defaulted status.
            for (const call of urlServiceGetUrlForResourceStub.getCalls()) {
                assert.equal(call.args[0].status, 'published');
            }
        });

        it('still falls back to the preview URL when a status-stripped post is unrouted', function () {
            const post = testUtils.DataGenerator.forKnex.createPost();
            delete post.status;

            urlServiceGetUrlForResourceStub.returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined).returns('preview url');

            assert.equal(getUrl(post), 'preview url');
        });

        it('keeps the real status when present', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.id, type: 'posts', status: 'draft'})).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined).returns('preview url');

            assert.equal(getUrl(post), 'preview url');
        });
    });

    describe('preview url: drafts/scheduled posts', function () {
        it('relative', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.id, type: 'posts'})).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined).returns('relative');
            let url = getUrl(post);

            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledOnce(urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined));

            assert.equal(url, 'relative');
        });

        it('absolute', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.id, type: 'posts'})).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, true).returns('absolute');
            let url = getUrl(post, true);

            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledOnce(urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, true));

            assert.equal(url, 'absolute');
        });
    });

    it('should return absolute url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: post.id, type: 'posts'}), {absolute: true, withSubdirectory: true})
            .returns('absolute post url');

        assert.equal(getUrl(post, true), 'absolute post url');
    });

    it('should return url for a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @NOTE: we currently have no way to generate a test model which is correctly jsonified
        //        e.g. testUtils.DataGenerator.forModel.createTag().toJSON()
        //        the tag object contains a `parent` attribute. the tag model contains a `parent_id` attr.
        tag.parent = null;

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: tag.id, type: 'tags'}), {absolute: undefined, withSubdirectory: true})
            .returns('tag url');

        assert.equal(getUrl(tag), 'tag url');
    });

    it('should return url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: author.id, type: 'authors'}), {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        assert.equal(getUrl(author), 'author url');
    });

    it('should return absolute url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlServiceGetUrlForResourceStub.withArgs(sinon.match({id: author.id, type: 'authors'}), {absolute: true, withSubdirectory: true})
            .returns('absolute author url');

        assert.equal(getUrl(author, true), 'absolute author url');
    });

    it('should return url for a nav', function () {
        const data = {
            label: 'About Me',
            url: '/about-me/',
            slug: 'about-me',
            current: true
        };

        urlUtilsUrlForStub.withArgs('nav', {nav: data}, undefined)
            .returns('nav url');

        assert.equal(getUrl(data), 'nav url');
    });

    it('should return absolute url for a nav', function () {
        const data = {
            label: 'About Me',
            url: '/about-me/',
            slug: 'about-me',
            current: true
        };

        urlUtilsUrlForStub.withArgs('nav', {nav: data}, true)
            .returns('absolute nav url');

        assert.equal(getUrl(data, true), 'absolute nav url');
    });
});
