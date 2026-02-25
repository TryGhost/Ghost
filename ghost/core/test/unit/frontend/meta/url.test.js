const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlUtils = require('../../../../core/shared/url-utils');
const urlService = require('../../../../core/server/services/url');
const getUrl = require('../../../../core/frontend/meta/url');
const testUtils = require('../../../utils');

describe('getUrl', function () {
    let urlServiceGetUrlByResourceIdStub;
    let urlUtilsUrlForStub;

    beforeEach(function () {
        urlServiceGetUrlByResourceIdStub = sinon.stub(urlService, 'getUrlByResourceId');
        urlUtilsUrlForStub = sinon.stub(urlUtils, 'urlFor');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlServiceGetUrlByResourceIdStub.withArgs(post.id, {absolute: undefined, withSubdirectory: true})
            .returns('post url');

        assert.equal(getUrl(post), 'post url');
    });

    describe('preview url: drafts/scheduled posts', function () {
        it('relative', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlByResourceIdStub.withArgs(post.id).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined).returns('relative');
            let url = getUrl(post);

            sinon.assert.calledOnce(urlServiceGetUrlByResourceIdStub);
            sinon.assert.calledOnce(urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined));

            assert.equal(url, 'relative');
        });

        it('absolute', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlByResourceIdStub.withArgs(post.id).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, true).returns('absolute');
            let url = getUrl(post, true);

            sinon.assert.calledOnce(urlServiceGetUrlByResourceIdStub);
            sinon.assert.calledOnce(urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, true));

            assert.equal(url, 'absolute');
        });
    });

    it('should return absolute url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlServiceGetUrlByResourceIdStub.withArgs(post.id, {absolute: true, withSubdirectory: true})
            .returns('absolute post url');

        assert.equal(getUrl(post, true), 'absolute post url');
    });

    it('should return url for a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @NOTE: we currently have no way to generate a test model which is correctly jsonified
        //        e.g. testUtils.DataGenerator.forModel.createTag().toJSON()
        //        the tag object contains a `parent` attribute. the tag model contains a `parent_id` attr.
        tag.parent = null;

        urlServiceGetUrlByResourceIdStub.withArgs(tag.id, {absolute: undefined, withSubdirectory: true})
            .returns('tag url');

        assert.equal(getUrl(tag), 'tag url');
    });

    it('should return url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlServiceGetUrlByResourceIdStub.withArgs(author.id, {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        assert.equal(getUrl(author), 'author url');
    });

    it('should return absolute url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlServiceGetUrlByResourceIdStub.withArgs(author.id, {absolute: true, withSubdirectory: true})
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
