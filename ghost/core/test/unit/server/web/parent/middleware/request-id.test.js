const should = require('should');
const sinon = require('sinon');
const validator = require('@tryghost/validator');

const requestId = require('../../../../../../core/server/web/parent/middleware/request-id');

describe('Request ID middleware', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        req = {
            get: sinon.stub()
        };
        res = {
            redirect: sinon.spy(),
            set: sinon.spy()
        };

        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('generates a new request ID if X-Request-ID not present', function () {
        should.not.exist(req.requestId);

        requestId(req, res, next);

        should.exist(req.requestId);
        validator.isUUID(req.requestId).should.be.true();
        res.set.calledOnce.should.be.false();
    });

    it('keeps the request ID if X-Request-ID is present', function () {
        should.not.exist(req.requestId);
        req.get.withArgs('X-Request-ID').returns('abcd');

        requestId(req, res, next);

        should.exist(req.requestId);
        req.requestId.should.eql('abcd');
        res.set.calledOnce.should.be.true();
        res.set.calledWith('X-Request-ID', 'abcd').should.be.true();
    });
});
