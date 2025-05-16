const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const urlUtils = require('../../../../core/shared/url-utils');
const testUtils = require('../../../utils');

let getAmpUrl = rewire('../../../../core/frontend/meta/amp-url');

describe('getAmpUrl', function () {
    let getUrlStub;
    let urlJoinStub;
    let urlForStub;

    beforeEach(function () {
        getUrlStub = sinon.stub();

        getAmpUrl = rewire('../../../../core/frontend/meta/amp-url');
        getAmpUrl.__set__('getUrl', getUrlStub);

        urlJoinStub = sinon.stub(urlUtils, 'urlJoin');
        urlForStub = sinon.stub(urlUtils, 'urlFor').withArgs('home', true).returns('http://localhost:9999');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return amp url for post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        // @TODO: WTF?
        post.context = ['post'];

        getUrlStub.withArgs(post, false).returns('url');
        urlJoinStub.withArgs('http://localhost:9999', 'url', 'amp/').returns('url');

        should.exist(getAmpUrl(post));

        urlJoinStub.calledOnce.should.be.true();
        urlForStub.calledOnce.should.be.true();
        getUrlStub.calledOnce.should.be.true();
    });

    it('should not return amp url for tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        // @TODO: WTF?
        tag.context = ['tag'];

        should.not.exist(getAmpUrl(tag));

        urlJoinStub.called.should.be.false();
        urlForStub.called.should.be.false();
        getUrlStub.called.should.be.false();
    });

    it('should not return amp url for author', function () {
        const author = testUtils.DataGenerator.forKnex.createUser();

        // @TODO: WTF?
        author.context = ['author'];

        should.not.exist(getAmpUrl(author));

        urlJoinStub.called.should.be.false();
        urlForStub.called.should.be.false();
        getUrlStub.called.should.be.false();
    });

    it('should not return amp url for amp post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost();

        // @TODO: WTF?
        post.context = ['amp', 'post'];

        should.not.exist(getAmpUrl(post));

        urlJoinStub.called.should.be.false();
        urlForStub.called.should.be.false();
        getUrlStub.called.should.be.false();
    });
});
