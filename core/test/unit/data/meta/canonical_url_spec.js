const should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    urlService = require('../../../../server/services/url'),
    testUtils = require('../../../utils');

let getCanonicalUrl = rewire('../../../../server/data/meta/canonical_url');

describe('getCanonicalUrl', function () {
    let getUrlStub;

    beforeEach(function () {
        getUrlStub = sinon.stub();

        getCanonicalUrl = rewire('../../../../server/data/meta/canonical_url');
        getCanonicalUrl.__set__('getUrl', getUrlStub);

        sinon.stub(urlService.utils, 'urlJoin');
        sinon.stub(urlService.utils, 'urlFor').withArgs('home', true).returns('http://localhost:9999');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return canonical url', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        getUrlStub.withArgs(post, false).returns('/post-url/');
        urlService.utils.urlJoin.withArgs('http://localhost:9999', '/post-url/').returns('canonical url');

        getCanonicalUrl(post).should.eql('canonical url');

        urlService.utils.urlJoin.calledOnce.should.be.true();
        urlService.utils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });

    it('should return canonical url for amp post without /amp/ in url', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        getUrlStub.withArgs(post, false).returns('/post-url/amp/');
        urlService.utils.urlJoin.withArgs('http://localhost:9999', '/post-url/amp/').returns('*/amp/');

        getCanonicalUrl(post).should.eql('*/');

        urlService.utils.urlJoin.calledOnce.should.be.true();
        urlService.utils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });

    it('should return home if empty secure data', function () {
        getUrlStub.withArgs({secure: true}, false).returns('/');
        urlService.utils.urlJoin.withArgs('http://localhost:9999', '/').returns('canonical url');

        getCanonicalUrl({secure: true}).should.eql('canonical url');

        urlService.utils.urlJoin.calledOnce.should.be.true();
        urlService.utils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });
});
