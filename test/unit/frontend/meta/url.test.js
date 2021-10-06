const should = require('should');
const sinon = require('sinon');
const urlUtils = require('../../../../core/shared/url-utils');
const urlService = require('../../../../core/frontend/services/url');
const getUrl = require('../../../../core/frontend/meta/url');
const testUtils = require('../../../utils');

describe('getUrl', function () {
    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId');
        sinon.stub(urlUtils, 'urlFor');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlService.getUrlByResourceId.withArgs(post.id, {absolute: undefined, secure: undefined, withSubdirectory: true})
            .returns('post url');

        getUrl(post).should.eql('post url');
    });

    describe('preview url: drafts/scheduled posts', function () {
        it('not absolute, not secure', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlService.getUrlByResourceId.withArgs(post.id).returns('/404/');
            urlUtils.urlFor.withArgs({relativeUrl: '/p/' + post.uuid + '/', secure: undefined}, null, undefined).returns('relative');
            let url = getUrl(post);

            urlService.getUrlByResourceId.calledOnce.should.be.true();
            urlUtils.urlFor.withArgs({relativeUrl: '/p/' + post.uuid + '/', secure: undefined}, null, undefined)
                .calledOnce.should.be.true();

            url.should.eql('relative');
        });

        it('absolute, not secure', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlService.getUrlByResourceId.withArgs(post.id).returns('/404/');
            urlUtils.urlFor.withArgs({relativeUrl: '/p/' + post.uuid + '/', secure: undefined}, null, true).returns('absolute');
            let url = getUrl(post, true);

            urlService.getUrlByResourceId.calledOnce.should.be.true();
            urlUtils.urlFor.withArgs({relativeUrl: '/p/' + post.uuid + '/', secure: undefined}, null, true)
                .calledOnce.should.be.true();

            url.should.eql('absolute');
        });

        it('absolute, secure', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            post.secure = true;
            urlService.getUrlByResourceId.withArgs(post.id).returns('/404/');
            urlUtils.urlFor.withArgs({relativeUrl: '/p/' + post.uuid + '/', secure: true}, null, true).returns('absolute secure');
            let url = getUrl(post, true);

            urlService.getUrlByResourceId.calledOnce.should.be.true();
            urlUtils.urlFor.withArgs({relativeUrl: '/p/' + post.uuid + '/', secure: true}, null, true)
                .calledOnce.should.be.true();

            url.should.eql('absolute secure');
        });
    });

    it('should return absolute url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlService.getUrlByResourceId.withArgs(post.id, {absolute: true, secure: undefined, withSubdirectory: true})
            .returns('absolute post url');

        getUrl(post, true).should.eql('absolute post url');
    });

    it('should return absolute url for a post and remove /amp/ in url', function () {
        const data = {relativeUrl: '/*/amp/'};

        urlUtils.urlFor.withArgs(data, {}, true).returns('absolute/*/amp/');
        getUrl(data, true).should.eql('absolute/*/');
        urlService.getUrlByResourceId.called.should.be.false();
    });

    it('should return url for a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @NOTE: we currently have no way to generate a test model which is correctly jsonified
        //        e.g. testUtils.DataGenerator.forModel.createTag().toJSON()
        //        the tag object contains a `parent` attribute. the tag model contains a `parent_id` attr.
        tag.parent = null;

        urlService.getUrlByResourceId.withArgs(tag.id, {absolute: undefined, secure: undefined, withSubdirectory: true})
            .returns('tag url');

        getUrl(tag).should.eql('tag url');
    });

    it('should return secure url for a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @NOTE: we currently have no way to generate a test model which is correctly jsonified
        //        e.g. testUtils.DataGenerator.forModel.createTag().toJSON()
        //        the tag object contains a `parent` attribute. the tag model contains a `parent_id` attr.
        tag.parent = null;

        // @TODO: WTF O_O
        tag.secure = true;

        urlService.getUrlByResourceId.withArgs(tag.id, {absolute: undefined, secure: true, withSubdirectory: true})
            .returns('secure tag url');

        getUrl(tag).should.eql('secure tag url');
    });

    it('should return url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlService.getUrlByResourceId.withArgs(author.id, {absolute: undefined, secure: undefined, withSubdirectory: true})
            .returns('author url');

        getUrl(author).should.eql('author url');
    });

    it('should return secure absolute url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        // @TODO: WTF
        author.secure = true;

        urlService.getUrlByResourceId.withArgs(author.id, {absolute: true, secure: true, withSubdirectory: true})
            .returns('absolute secure author url');

        getUrl(author, true).should.eql('absolute secure author url');
    });

    it('should return url for a nav', function () {
        const data = {
            label: 'About Me',
            url: '/about-me/',
            slug: 'about-me',
            current: true
        };

        urlUtils.urlFor.withArgs('nav', {nav: data, secure: data.secure}, undefined)
            .returns('nav url');

        getUrl(data).should.equal('nav url');
    });

    it('should return absolute url for a nav', function () {
        const data = {
            label: 'About Me',
            url: '/about-me/',
            slug: 'about-me',
            current: true
        };

        urlUtils.urlFor.withArgs('nav', {nav: data, secure: data.secure}, true)
            .returns('absolute nav url');

        getUrl(data, true).should.equal('absolute nav url');
    });

    it('should return `relativeUrl` and remove /amp/ in url', function () {
        const data = {relativeUrl: '/*/amp/'};

        urlUtils.urlFor.withArgs(data, {}, undefined).returns(data.relativeUrl);
        getUrl(data).should.eql('/*/');
        urlService.getUrlByResourceId.called.should.be.false();
    });
});
