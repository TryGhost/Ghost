/*globals describe, beforeEach, it*/
var should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    errors = require('../../shared/errorHandling');

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
            logStub = sinon.stub(console, "log");

        errors.logError(err);

        // Calls log with message on Error objects
        logStub.calledWith("Error occurred: ", err.message).should.equal(true);

        logStub.reset();

        err = "test2";

        errors.logError(err);

        // Calls log with string on strings
        logStub.calledWith("Error occurred: ", err).should.equal(true);

        logStub.restore();
    });

    it("logs promise errors with custom messages", function (done) {
        var def = when.defer(),
            prom = def.promise,
            logStub = sinon.stub(console, "log");

        prom.then(function () {
            throw new Error("Ran success handler");
        }, errors.logErrorWithMessage("test1"));

        prom.otherwise(function () {
            logStub.calledWith("Error occurred: ", "test1").should.equal(true);
            logStub.restore();

            done();
        });

        def.reject();
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
            logStub = sinon.stub(console, "log"),
            redirectStub = sinon.stub(res, "redirect");

        prom.then(function () {
            throw new Error("Ran success handler");
        }, errors.logErrorWithRedirect("test1", "/testurl", req, res));

        prom.otherwise(function () {
            logStub.calledWith("Error occurred: ", "test1").should.equal(true);
            logStub.restore();

            redirectStub.calledWith('/testurl').should.equal(true);
            redirectStub.restore();

            done();
        });

        def.reject();
    });
});