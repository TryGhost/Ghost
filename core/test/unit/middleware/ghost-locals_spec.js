var sinon        = require('sinon'),
    should       = require('should'),
    ghostLocals  = require('../../../server/middleware/ghost-locals');

describe('Theme Handler', function () {
    var req, res, next;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
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
