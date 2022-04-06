const should = require('should');
const sinon = require('sinon');
const ghostLocals = require('../../../../../../core/server/web/parent/middleware/ghost-locals');

describe('Theme Handler', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
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
