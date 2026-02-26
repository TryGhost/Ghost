const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../../../../core/shared/url-utils');
const middleware = require('../../../../../../core/frontend/services/routing/middleware');

describe('UNIT: services/routing/middleware/page-param', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = sinon.stub();
        req.params = {};

        res = sinon.stub();
        next = sinon.stub();

        sinon.stub(urlUtils, 'redirect301');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('success', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/2/';
        req.url = '/blog/page/2/';

        middleware.pageParam(req, res, next, 2);

        sinon.assert.notCalled(urlUtils.redirect301);
        sinon.assert.calledOnce(next);
        assert.equal(req.params.page, 2);
    });

    it('redirect for /page/1/', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/1/';
        req.url = '/blog/page/1/';

        middleware.pageParam(req, res, next, 1);

        sinon.assert.calledOnce(urlUtils.redirect301);
        sinon.assert.notCalled(next);
    });

    it('404 for /page/0/', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/0/';
        req.url = '/blog/page/0/';

        middleware.pageParam(req, res, next, 0);

        sinon.assert.notCalled(urlUtils.redirect301);
        sinon.assert.calledOnce(next);
        assert.equal((next.args[0][0] instanceof errors.NotFoundError), true);
    });

    it('404 for /page/something/', function () {
        req.originalUrl = 'http://localhost:2368/blog/page/something/';
        req.url = '/blog/page/something/';

        middleware.pageParam(req, res, next, 'something');

        sinon.assert.notCalled(urlUtils.redirect301);
        sinon.assert.calledOnce(next);
        assert.equal((next.args[0][0] instanceof errors.NotFoundError), true);
    });

    it('redirect for /rss/page/1/', function () {
        req.originalUrl = 'http://localhost:2368/blog/rss/page/1/';
        req.url = '/blog/rss/page/1/';

        middleware.pageParam(req, res, next, 1);

        sinon.assert.calledOnce(urlUtils.redirect301);
        sinon.assert.notCalled(next);
    });
});
