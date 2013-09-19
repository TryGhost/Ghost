/*globals describe, beforeEach, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    when = require('when'),
    sinon = require('sinon'),

    // Stuff we are testing
    colors = require("colors"),
    errors = require('../../server/errorHandling'),
    // storing current environment
    currentEnv = process.env.NODE_ENV;

describe("Error handling", function () {

    // Just getting rid of jslint unused error
    should.exist(errors);

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

    it("logs errors", function () {
        var err = new Error("test1"),
            logStub = sinon.stub(console, "error");

        // give environment a value that will console log
        process.env.NODE_ENV = "development";
        errors.logError(err);

        // Calls log with message on Error objects
        logStub.calledWith("\nERROR:".red, err.message.red).should.equal(true);

        logStub.reset();

        err = "test2";

        errors.logError(err);

        // Calls log with string on strings
        logStub.calledWith("\nERROR:".red, err.red).should.equal(true);

        logStub.restore();
        process.env.NODE_ENV = currentEnv;

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
            logStub = sinon.stub(console, "error"),
            redirectStub = sinon.stub(res, "redirect");

        // give environment a value that will console log
        process.env.NODE_ENV = "development";
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
        prom.ensure(function () {
            // gives the environment the correct value back
            process.env.NODE_ENV = currentEnv;
        });
        def.reject();
    });
});