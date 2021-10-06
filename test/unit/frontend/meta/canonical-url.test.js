const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const urlUtils = require('../../../../core/shared/url-utils');
const testUtils = require('../../../utils');

let getCanonicalUrl = rewire('../../../../core/frontend/meta/canonical-url');

describe('getCanonicalUrl', function () {
    let getUrlStub;

    beforeEach(function () {
        getUrlStub = sinon.stub();

        getCanonicalUrl = rewire('../../../../core/frontend/meta/canonical-url');
        getCanonicalUrl.__set__('getUrl', getUrlStub);

        sinon.stub(urlUtils, 'urlJoin');
        sinon.stub(urlUtils, 'urlFor').withArgs('home', true).returns('http://localhost:9999');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return default canonical url', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        getUrlStub.withArgs(post, false).returns('/post-url/');
        urlUtils.urlJoin.withArgs('http://localhost:9999', '/post-url/').returns('canonical url');

        getCanonicalUrl(post).should.eql('canonical url');

        urlUtils.urlJoin.calledOnce.should.be.true();
        urlUtils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });

    it('should return canonical url field if present', function () {
        const post = testUtils.DataGenerator.forKnex.createPost({canonical_url: 'https://example.com/canonical'});

        getCanonicalUrl({
            context: ['post'],
            post: post
        }).should.eql('https://example.com/canonical');

        getUrlStub.called.should.equal(false);
    });

    it('should return canonical url for amp post without /amp/ in url', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        getUrlStub.withArgs(post, false).returns('/post-url/amp/');
        urlUtils.urlJoin.withArgs('http://localhost:9999', '/post-url/amp/').returns('*/amp/');

        getCanonicalUrl(post).should.eql('*/');

        urlUtils.urlJoin.calledOnce.should.be.true();
        urlUtils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });

    it('should return home if empty secure data', function () {
        getUrlStub.withArgs({secure: true}, false).returns('/');
        urlUtils.urlJoin.withArgs('http://localhost:9999', '/').returns('canonical url');

        getCanonicalUrl({secure: true}).should.eql('canonical url');

        urlUtils.urlJoin.calledOnce.should.be.true();
        urlUtils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });
});
