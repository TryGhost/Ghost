/*globals describe, beforeEach, it*/
var assert = require('assert'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    express = require('express'),
    middleware = require('../../server/middleware');

describe('Middleware', function () {
    describe('staticTheme', function () {
        var realExpressStatic = express.static;

        beforeEach(function () {
            sinon.stub(middleware, 'forwardToExpressStatic').yields();
        });

        afterEach(function () {
            middleware.forwardToExpressStatic.restore();
        });

        it('should call next if hbs file type', function (done) {
            var req = {
                url: 'mytemplate.hbs'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                return done();
            });
        });

        it('should call next if md file type', function (done) {
            var req = {
                url: 'README.md'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                return done();
            });
        });

        it('should call next if json file type', function (done) {
            var req = {
                url: 'sample.json'
            }

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                return done();
            });
        });

        it('should call express.static if valid file type', function (done) {
            var ghostStub = {
                paths: function() {
                   return {activeTheme: 'ACTIVETHEME'};
                }
            };

            var req = {
                url: 'myvalidfile.css'
            };

            middleware.staticTheme(ghostStub)(req, null, function (req, res, next) {
                middleware.forwardToExpressStatic.calledOnce.should.be.true;
                assert.deepEqual(middleware.forwardToExpressStatic.args[0][0], ghostStub);
                return done();
            });
        });
    });
});

