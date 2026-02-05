const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const helpers = require('../../../../../core/frontend/services/rendering');

describe('handleError', function () {
    let next;

    beforeEach(function () {
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should call next with no args for 404 errors', function () {
        const notFoundError = new errors.NotFoundError({message: 'Something wasn\'t found'});
        helpers.handleError(next)(notFoundError);

        assert.equal(next.calledOnce, true);
        next.firstCall.args.should.be.empty();
    });

    it('should call next with error for other errors', function () {
        const otherError = new Error();
        otherError.message = 'Something wasn\'t allowed';

        helpers.handleError(next)(otherError);

        assert.equal(next.calledOnce, true);
        assert.equal(next.firstCall.args.length, 1);
        next.firstCall.args[0].should.be.an.Object();
        next.firstCall.args[0].should.be.instanceof(Error);
    });
});
