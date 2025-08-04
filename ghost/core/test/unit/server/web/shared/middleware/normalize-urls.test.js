const should = require('should');
const sinon = require('sinon');
const normalizeUrls = require('../../../../../../core/server/web/shared/middleware/normalize-urls');
const urlUtils = require('../../../../../../core/shared/url-utils');

describe('Normalize URLs middleware', function () {
    let req, res, next, redirect301Stub;

    beforeEach(function () {
        req = {
            path: '',
            originalUrl: '',
            baseUrl: ''
        };
        res = {};
        next = sinon.spy();
        redirect301Stub = sinon.stub(urlUtils, 'redirect301');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should pass through normal URLs without redirect', function () {
        req.path = '/tag/normal-tag/';
        req.originalUrl = '/tag/normal-tag/';

        normalizeUrls(req, res, next);

        next.calledOnce.should.be.true();
        redirect301Stub.called.should.be.false();
    });

    it('should redirect tag URLs with accented characters', function () {
        req.path = '/tag/sécurité incendie/';
        req.originalUrl = '/tag/sécurité incendie/';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/tag/securite-incendie/').should.be.true();
        next.called.should.be.false();
    });

    it('should redirect tag URLs with spaces only', function () {
        req.path = '/tag/hello world/';
        req.originalUrl = '/tag/hello world/';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/tag/hello-world/').should.be.true();
        next.called.should.be.false();
    });

    it('should redirect author URLs with accented characters', function () {
        req.path = '/author/andré martin/';
        req.originalUrl = '/author/andré martin/';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/author/andre-martin/').should.be.true();
        next.called.should.be.false();
    });

    it('should handle pagination URLs with accented characters', function () {
        req.path = '/tag/sécurité incendie/page/2/';
        req.originalUrl = '/tag/sécurité incendie/page/2/';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/tag/securite-incendie/page/2/').should.be.true();
        next.called.should.be.false();
    });

    it('should handle URLs with query parameters', function () {
        req.path = '/tag/café & tea/';
        req.originalUrl = '/tag/café & tea/?utm_source=test';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/tag/cafe-tea/?utm_source=test').should.be.true();
        next.called.should.be.false();
    });

    it('should ignore non-taxonomy URLs', function () {
        req.path = '/posts/sécurité-article/';
        req.originalUrl = '/posts/sécurité-article/';

        normalizeUrls(req, res, next);

        next.calledOnce.should.be.true();
        redirect301Stub.called.should.be.false();
    });

    it('should ignore already encoded URLs', function () {
        req.path = '/tag/s%C3%A9curit%C3%A9%20incendie/';
        req.originalUrl = '/tag/s%C3%A9curit%C3%A9%20incendie/';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/tag/securite-incendie/').should.be.true();
        next.called.should.be.false();
    });

    it('should handle baseUrl correctly', function () {
        req.baseUrl = '/blog';
        req.path = '/tag/sécurité incendie/';
        req.originalUrl = '/blog/tag/sécurité incendie/';

        normalizeUrls(req, res, next);

        redirect301Stub.calledOnce.should.be.true();
        redirect301Stub.calledWith(res, '/blog/tag/securite-incendie/').should.be.true();
        next.called.should.be.false();
    });

    it('should handle malformed URIs gracefully', function () {
        req.path = '/tag/%GG/';
        req.originalUrl = '/tag/%GG/';

        normalizeUrls(req, res, next);

        // Should call next with error for malformed URI
        next.calledOnce.should.be.true();
        next.args[0][0].should.be.an.instanceOf(Error);
        redirect301Stub.called.should.be.false();
    });
});