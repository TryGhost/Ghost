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

        getUrl(post).should.eql('post url');
    });

    describe('preview url: drafts/scheduled posts', function () {
        it('relative', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlByResourceIdStub.withArgs(post.id).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined).returns('relative');
            let url = getUrl(post);

            urlServiceGetUrlByResourceIdStub.calledOnce.should.be.true();
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, undefined)
                .calledOnce.should.be.true();

            url.should.eql('relative');
        });

        it('absolute', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({status: 'draft'});
            urlServiceGetUrlByResourceIdStub.withArgs(post.id).returns('/404/');
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, true).returns('absolute');
            let url = getUrl(post, true);

            urlServiceGetUrlByResourceIdStub.calledOnce.should.be.true();
            urlUtilsUrlForStub.withArgs({relativeUrl: '/p/' + post.uuid + '/'}, null, true)
                .calledOnce.should.be.true();

            url.should.eql('absolute');
        });
    });

    it('should return absolute url for a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        urlServiceGetUrlByResourceIdStub.withArgs(post.id, {absolute: true, withSubdirectory: true})
            .returns('absolute post url');

        getUrl(post, true).should.eql('absolute post url');
    });

    it('should return url for a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @NOTE: we currently have no way to generate a test model which is correctly jsonified
        //        e.g. testUtils.DataGenerator.forModel.createTag().toJSON()
        //        the tag object contains a `parent` attribute. the tag model contains a `parent_id` attr.
        tag.parent = null;

        urlServiceGetUrlByResourceIdStub.withArgs(tag.id, {absolute: undefined, withSubdirectory: true})
            .returns('tag url');

        getUrl(tag).should.eql('tag url');
    });

    it('should return url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlServiceGetUrlByResourceIdStub.withArgs(author.id, {absolute: undefined, withSubdirectory: true})
            .returns('author url');

        getUrl(author).should.eql('author url');
    });

    it('should return absolute url for a author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        urlServiceGetUrlByResourceIdStub.withArgs(author.id, {absolute: true, withSubdirectory: true})
            .returns('absolute author url');

        getUrl(author, true).should.eql('absolute author url');
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

        getUrl(data).should.equal('nav url');
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

        getUrl(data, true).should.equal('absolute nav url');
    });
});
