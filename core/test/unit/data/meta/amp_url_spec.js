const should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    sandbox = sinon.sandbox.create(),
    urlService = require('../../../../server/services/url'),
    testUtils = require('../../../utils');

let getAmpUrl = rewire('../../../../server/data/meta/amp_url');

describe('getAmpUrl', function () {
    let getUrlStub;

    beforeEach(function () {
        getUrlStub = sandbox.stub();

        getAmpUrl = rewire('../../../../server/data/meta/amp_url');
        getAmpUrl.__set__('getUrl', getUrlStub);

        sandbox.stub(urlService.utils, 'urlJoin');
        sandbox.stub(urlService.utils, 'urlFor').withArgs('home', true).returns('http://localhost:9999');
    });

    afterEach(function () {
       sandbox.restore();
    });

    it('should return amp url for post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        // @TODO: WTF?
        post.context = ['post'];

        getUrlStub.withArgs(post, false).returns('url');
        urlService.utils.urlJoin.withArgs('http://localhost:9999', 'url', 'amp/').returns('url');

        should.exist(getAmpUrl(post));

        urlService.utils.urlJoin.calledOnce.should.be.true();
        urlService.utils.urlFor.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });

    it('should not return amp url for tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @TODO: WTF?
        tag.context = ['tag'];

        should.not.exist(getAmpUrl(tag));

        urlService.utils.urlJoin.called.should.be.false();
        urlService.utils.urlFor.called.should.be.false();
        getUrlStub.called.should.be.false();
    });

    it('should not return amp url for author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        // @TODO: WTF?
        author.context = ['author'];

        should.not.exist(getAmpUrl(author));

        urlService.utils.urlJoin.called.should.be.false();
        urlService.utils.urlFor.called.should.be.false();
        getUrlStub.called.should.be.false();
    });

    it('should not return amp url for amp post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        // @TODO: WTF?
        post.context = ['amp', 'post'];

        should.not.exist(getAmpUrl(post));

        urlService.utils.urlJoin.called.should.be.false();
        urlService.utils.urlFor.called.should.be.false();
        getUrlStub.called.should.be.false();
    });
});
