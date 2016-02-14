/*globals describe, beforeEach, afterEach, it*/
var should   = require('should'),
    sinon    = require('sinon'),
    errors   = require('../../../../server/errors'),

// Stuff we are testing
    handleError = require('../../../../server/controllers/frontend/error'),

    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

describe('handleError', function () {
    var next;
    beforeEach(function () {
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should call next with no args for 404 errors', function () {
        var notFoundError = new errors.NotFoundError('Something wasn\'t found');
        handleError(next)(notFoundError);

        next.calledOnce.should.be.true();
        next.firstCall.args.should.be.empty();
    });

    it('should call next with error for other errors', function () {
        var otherError = new errors.MethodNotAllowedError('Something wasn\'t allowed');

        handleError(next)(otherError);

        next.calledOnce.should.be.true();
        next.firstCall.args.should.have.lengthOf(1);
        next.firstCall.args[0].should.be.an.Object();
        next.firstCall.args[0].should.be.instanceof(Error);
    });
});
