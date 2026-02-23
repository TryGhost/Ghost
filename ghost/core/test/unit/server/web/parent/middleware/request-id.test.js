const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
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
        assert.equal(req.requestId, undefined);

        requestId(req, res, next);

        assertExists(req.requestId);
        assert.equal(validator.isUUID(req.requestId), true);
        assert.equal(res.set.calledOnce, false);
    });

    it('keeps the request ID if X-Request-ID is present', function () {
        assert.equal(req.requestId, undefined);
        req.get.withArgs('X-Request-ID').returns('abcd');

        requestId(req, res, next);

        assertExists(req.requestId);
        assert.equal(req.requestId, 'abcd');
        assert.equal(res.set.calledOnce, true);
        assert.equal(res.set.calledWith('X-Request-ID', 'abcd'), true);
    });
});
