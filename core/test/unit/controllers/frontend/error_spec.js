var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    common = require('../../../../server/lib/common'),

    // Stuff we are testing
    handleError = require('../../../../server/controllers/frontend/error'),

    sandbox = sinon.sandbox.create();

describe('handleError', function () {
    var next;
    beforeEach(function () {
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should call next with no args for 404 errors', function () {
        var notFoundError = new common.errors.NotFoundError({message: 'Something wasn\'t found'});
        handleError(next)(notFoundError);

        next.calledOnce.should.be.true();
        next.firstCall.args.should.be.empty();
    });
    it('should call next with error for other errors', function () {
        var otherError = new Error();
        otherError.message = 'Something wasn\'t allowed';

        handleError(next)(otherError);

        next.calledOnce.should.be.true();
        next.firstCall.args.should.have.lengthOf(1);
        next.firstCall.args[0].should.be.an.Object();
        next.firstCall.args[0].should.be.instanceof(Error);
    });
});
