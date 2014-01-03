/*globals describe, before, beforeEach, afterEach, it*/
var testUtils  = require('../utils'),
    should     = require('should'),
    when       = require('when'),
    sinon      = require('sinon'),
    express    = require("express"),

    // Stuff we are testing
    colors     = require("colors"),
    errors     = require('../../server/errorHandling'),
    // storing current environment
    currentEnv = process.env.NODE_ENV,
    ONE_HOUR_S = 60 * 60;

describe("Error handling", function () {

    // Just getting rid of jslint unused error
    should.exist(errors);

    describe('Throwing', function () {
        it("throws error objects", function () {
            var toThrow = new Error("test1"),
                runThrowError = function () {
                    errors.throwError(toThrow);
                };

            runThrowError.should['throw']("test1");
        });

        it("throws error strings", function () {
            var toThrow = "test2",
                runThrowError = function () {
                    errors.throwError(toThrow);
                };

            runThrowError.should['throw']("test2");
        });

        it("throws error even if nothing passed", function () {
            var runThrowError = function () {
                errors.throwError();
            };

            runThrowError.should['throw']("An error occurred");
        });
    });

    describe('Logging', function () {
        var logStub;

        beforeEach(function () {
            logStub = sinon.stub(console, "error");
            // give environment a value that will console log
            process.env.NODE_ENV = "development";
        });

        afterEach(function () {
            logStub.restore();
            // reset the environment
            process.env.NODE_ENV = currentEnv;
        });

        it("logs errors from error objects", function () {
            var err = new Error("test1");

            errors.logError(err);

            // Calls log with message on Error objects
            logStub.calledThrice.should.be.true;
            logStub.firstCall.calledWith("\nERROR:".red, err.message.red).should.be.true;
            logStub.secondCall.calledWith('').should.be.true;
            logStub.thirdCall.calledWith(err.stack, '\n').should.be.true;

        });

        it("logs errors from strings", function () {
            var err = "test2";

            errors.logError(err);

            // Calls log with string on strings
            logStub.calledTwice.should.be.true;
            logStub.firstCall.calledWith("\nERROR:".red, err.red).should.be.true;
            logStub.secondCall.calledWith('').should.be.true;
        });

        it("logs errors from an error object and two string arguments", function () {
            var err = new Error("test1"),
                message = "Testing";

            errors.logError(err, message, message);

            // Calls log with message on Error objects

            logStub.callCount.should.equal(5);
            logStub.calledWith("\nERROR:".red, err.message.red).should.be.true;
            logStub.firstCall.calledWith("\nERROR:".red, err.message.red).should.be.true;
            logStub.secondCall.calledWith(message.white).should.be.true;
            logStub.thirdCall.calledWith(message.green).should.be.true;
            logStub.getCall(3).calledWith('').should.be.true; //nth call uses zero-based numbering
            logStub.lastCall.calledWith(err.stack, '\n').should.be.true;
        });

        it("logs errors from three string arguments", function () {
            var message = "Testing";

            errors.logError(message, message, message);

            // Calls log with message on Error objects

            logStub.callCount.should.equal(4);
            logStub.firstCall.calledWith("\nERROR:".red, message.red).should.be.true;
            logStub.secondCall.calledWith(message.white).should.be.true;
            logStub.thirdCall.calledWith(message.green).should.be.true;
            logStub.lastCall.calledWith('').should.be.true;
        });

        it("logs promise errors and redirects", function (done) {
            var def = when.defer(),
                prom = def.promise,
                req = null,
                res = {
                    redirect: function () {
                        return;
                    }
                },
                redirectStub = sinon.stub(res, "redirect");

            // give environment a value that will console log
            prom.then(function () {
                throw new Error("Ran success handler");
            }, errors.logErrorWithRedirect("test1", null, null, "/testurl", req, res));

            prom.otherwise(function () {
                logStub.calledWith("\nERROR:".red, "test1".red).should.equal(true);
                logStub.restore();

                redirectStub.calledWith('/testurl').should.equal(true);
                redirectStub.restore();

                done();
            });
            def.reject();
        });
    });

    describe('Rendering', function () {
        var sandbox;

        before(function () {
            errors.updateActiveTheme('casper', false);
        });

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
        });

        afterEach(function () {
            sandbox.restore();
        });


        it('Renders end-of-middleware 404 errors correctly', function (done) {
            var req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('Page Not Found');
                options.code.should.equal(404);
                this.statusCode.should.equal(404);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal('public, max-age=' + ONE_HOUR_S);

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });

            errors.error404(req, res, done);
        });

        it('Renders thrown 404 errors correctly', function (done) {
            var err = new Error('A thing was not found'),
                req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('Page Not Found');
                options.code.should.equal(404);
                this.statusCode.should.equal(404);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal('public, max-age=' + ONE_HOUR_S);

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });


            err.status = 404;
            errors.error500(err, req, res, null);
        });

        it('Renders thrown errors correctly', function (done) {
            var err = new Error('I am a big bad error'),
                req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('I am a big bad error');
                options.code.should.equal(500);
                this.statusCode.should.equal(500);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal('no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });

            errors.error500(err, req, res, null);
        });

        it('Renders 500 errors correctly', function (done) {
            var err = new Error('I am a big bad error'),
                req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('I am a big bad error');
                options.code.should.equal(500);
                this.statusCode.should.equal(500);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal('no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });

            err.code = 500;
            errors.error500(err, req, res, null);
        });
    });
});