const sinon = require('sinon');
const testUtils = require('../../../../utils');

const frontendCaching = require('../../../../../core/frontend/web/middleware/frontend-caching');

describe('frontendCaching', function () {
    let res;
    let req;
    let next;
    let middleware;

    this.beforeEach(async function () {
        res = {
            set: sinon.spy(),
            get: sinon.stub().returns(undefined)
        };
        req = sinon.spy();
        next = sinon.spy();
        middleware = await frontendCaching.getMiddleware();
    });

    this.afterEach(async function () {
        sinon.restore();
    });

    it('should set cache control to private if the blog is private', function () {
        res.isPrivateBlog = true;
        middleware(req, res, next);
        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': testUtils.cacheRules.private});
    });

    it('should set cache control to private if the request is made by a member', function () {
        req.member = true;
        middleware(req, res, next);
        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': testUtils.cacheRules.private});
    });

    it('should set cache control to public if the site is public and the request is not made by a member', function () {
        req.member = undefined;
        res.isPrivateBlog = undefined;
        middleware(req, res, next);
        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': testUtils.cacheRules.public});
    });

    it('should set cache control to no-cache if the path starts with /p/', function () {
        req.path = '/p/test';
        middleware(req, res, next);
        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': testUtils.cacheRules.noCache});
    });
});
