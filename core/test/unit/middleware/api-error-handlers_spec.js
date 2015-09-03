/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should          = require('should'),
    sinon           = require('sinon'),

    middleware      = require('../../../server/middleware').middleware,
    errors          = require('../../../server/errors');

// To stop jshint complaining
should.equal(true, true);

describe('Middleware: API Error Handlers', function () {
    var sandbox, req, res, next;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = {};
        res = {};
        res.json = sandbox.spy();
        res.status = sandbox.stub().returns(res);
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('errorHandler', function () {
        it('sends a JSON error response', function () {
            errors.logError = sandbox.spy(errors, 'logError');
            errors.formatHttpErrors = sandbox.spy(errors, 'formatHttpErrors');

            var msg = 'Something got lost',
                err = new errors.NotFoundError(msg);

            middleware.api.errorHandler(err, req, res, next);

            next.called.should.be.false;
            errors.logError.calledOnce.should.be.true;
            errors.formatHttpErrors.calledOnce.should.be.true;

            res.status.calledWith(404).should.be.true;
            res.json.calledOnce.should.be.true;
            res.json.firstCall.args[0].errors[0].message.should.eql(msg);
            res.json.firstCall.args[0].errors[0].errorType.should.eql('NotFoundError');
        });
    });
});
