const should = require('should'),
    sinon = require('sinon'),
    common = require('../../../../../server/lib/common'),
    urlService = require('../../../../../server/services/url'),
    middlewares = require('../../../../../server/services/routing/middlewares');

describe('UNIT: services/routing/middlewares/page-param', function () {
    let req, res, next;

    beforeEach(function () {
        req = sinon.stub();
        req.params = {};

        res = sinon.stub();
        next = sinon.stub();

        sinon.stub(urlService.utils, 'redirect301');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('success', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/2/';
        req.url = '/blog/page/2/';

        middlewares.pageParam(req, res, next, 2);

        urlService.utils.redirect301.called.should.be.false();
        next.calledOnce.should.be.true();
        req.params.page.should.eql(2);
    });

    it('redirect for /page/1/', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/1/';
        req.url = '/blog/page/1/';

        middlewares.pageParam(req, res, next, 1);

        urlService.utils.redirect301.calledOnce.should.be.true();
        next.called.should.be.false();
    });

    it('404 for /page/0/', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/0/';
        req.url = '/blog/page/0/';

        middlewares.pageParam(req, res, next, 0);

        urlService.utils.redirect301.called.should.be.false();
        next.calledOnce.should.be.true();
        (next.args[0][0] instanceof common.errors.NotFoundError).should.be.true();
    });

    it('404 for /page/something/', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/something/';
        req.url = '/blog/page/something/';

        middlewares.pageParam(req, res, next, 'something');

        urlService.utils.redirect301.called.should.be.false();
        next.calledOnce.should.be.true();
        (next.args[0][0] instanceof common.errors.NotFoundError).should.be.true();
    });

    it('redirect for /rss/page/1/', function () {
        req.originalUrl = 'http://localhost:2368/blog/rss/page/1/';
        req.url = '/blog/rss/page/1/';

        middlewares.pageParam(req, res, next, 1);

        urlService.utils.redirect301.calledOnce.should.be.true();
        next.called.should.be.false();
    });
});
