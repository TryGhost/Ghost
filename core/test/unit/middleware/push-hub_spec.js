/*globals describe, beforeEach, afterEach, it*/
var rewire  = require('rewire'),
    sinon   = require('sinon'),
    should  = require('should'),

    pushHub = rewire('../../../server/middleware/push-hub'),
    errors  = require('../../../server/errors');

describe('Middleware: PuSH Hub', function () {
    var req, res, next, sandbox, errorsStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = {};
        res = {};
        next = sandbox.spy();
        errorsStub = {
            sendPlainTextError: sinon.stub(),
            ValidationError: errors.ValidationError
        };

        pushHub.__set__('errors', errorsStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Content-Type validation', function () {
        it('should send a plain text error when the value of the Content-Type header is invalid', function () {
            req.get = sinon.stub();
            req.get.withArgs('Content-Type').returns('application/json');

            pushHub.validateContentType(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('Content-Type is invalid');
            next.called.should.be.false();
        });
    });

    describe('hub.callback request parameter validation', function () {
        it('should send a plain text error when the value of the hub.callback request parameter is empty', function () {
            req.body = {};

            pushHub.validateCallback(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('hub.callback request parameter missing or empty');
            next.called.should.be.false();
        });

        it('should send a plain text error when the value of the hub.callback request parameter is invalid', function () {
            var validatorStub = {
                isURL: sinon.stub()
            };

            req.body = {};
            req.body['hub.callback'] = 'foo';

            validatorStub.isURL
                .withArgs(req.body['hub.callback'])
                .returns(false);

            pushHub.__set__('validator', validatorStub);

            pushHub.validateCallback(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('hub.callback request parameter is invalid');
            next.called.should.be.false();
        });
    });

    describe('hub.topic request parameter validation', function () {
        it('should send a plain text error when the value of the hub.topic request parameter is empty', function () {
            req.body = {};

            pushHub.validateTopic(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('hub.topic request parameter missing or empty');
            next.called.should.be.false();
        });

        it('should send a plain text error when the value of the hub.topic request parameter is invalid', function () {
            var configStub = {
                urlFor: sinon.stub()
            };

            req.body = {};
            req.body['hub.topic'] = 'foo';

            configStub.urlFor
                .withArgs('rss', true)
                .returns('bar');

            pushHub.__set__('config', configStub);

            pushHub.validateTopic(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('hub.topic request parameter is invalid');
            next.called.should.be.false();
        });
    });

    describe('hub.mode request parameter validation', function () {
        it('should send a plain text error when the value of the hub.mode request parameter is empty', function () {
            req.body = {};

            pushHub.validateHubMode(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('hub.mode request parameter missing or empty');
            next.called.should.be.false();
        });

        it('should send a plain text error when the value of the hub.mode request parameter is invalid', function () {
            req.body = {};
            req.body['hub.mode'] = 'foo';

            pushHub.validateHubMode(req, res, next);

            errorsStub.sendPlainTextError.calledOnce.should.be.true();
            errorsStub.sendPlainTextError.calledWith(sinon.match.instanceOf(errors.ValidationError), req, res, next).should.be.true();
            errorsStub.sendPlainTextError.firstCall.args[0].message.should.eql('hub.mode request parameter is invalid');
            next.called.should.be.false();
        });
    });
});
