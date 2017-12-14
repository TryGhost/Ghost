var should = require('should'),
    sinon = require('sinon'),
    ghostLocals = require('../../../../server/web/middleware/ghost-locals'),

    sandbox = sinon.sandbox.create();

describe('Theme Handler', function () {
    var req, res, next;

    beforeEach(function () {
        req = sandbox.spy();
        res = sandbox.spy();
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('ghostLocals', function () {
        it('sets all locals', function () {
            req.path = '/awesome-post';

            ghostLocals(req, res, next);

            res.locals.should.be.an.Object();
            should.exist(res.locals.version);
            should.exist(res.locals.safeVersion);
            res.locals.relativeUrl.should.equal(req.path);
            next.called.should.be.true();
        });
    });
});
