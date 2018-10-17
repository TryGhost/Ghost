const should = require('should');
const sinon = require('sinon');
const ghostLocals = require('../../../../server/web/shared/middlewares/ghost-locals');
const themeService = require('../../../../server/services/themes');
const sandbox = sinon.sandbox.create();

describe('Theme Handler', function () {
    let req, res, next;

    beforeEach(function () {
        req = sandbox.spy();
        res = sandbox.spy();
        next = sandbox.spy();

        sandbox.stub(themeService, 'getActive').callsFake(() => {
           return {
               engine() {
                   return 'v0.1';
               }
           };
        });
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
            should.exist(res.locals.apiVersion);
            res.locals.relativeUrl.should.equal(req.path);
            res.locals.apiVersion.should.equal('v0.1');
            next.called.should.be.true();
        });
    });
});
