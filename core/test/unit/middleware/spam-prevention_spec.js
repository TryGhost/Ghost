/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should      = require('should'),
    sinon       = require('sinon'),
    middleware  = require('../../../server/middleware').middleware;

describe('Middleware: spamPrevention', function () {
    var sandbox,
        req,
        next,
        error,
        spyNext;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        error = null;

        next = sinon.spy();

        spyNext = sinon.spy(function (param) {
            error = param;
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('signin', function () {
        beforeEach(function () {
            req = {
                connection: {
                    remoteAddress: '10.0.0.0'
                },
                body: {
                    username: 'tester',
                    grant_type: 'password'
                }
            };
        });

        it('calls next if refreshing the token', function (done) {
            req.body.grant_type = 'refresh_token';
            middleware.spamPrevention.signin(req, null, next);

            next.calledOnce.should.be.true;
            done();
        });

        it ('creates a BadRequestError when there\'s no username', function (done) {
            req.body = {};

            middleware.spamPrevention.signin(req, null, spyNext);

            should.exist(error);
            error.should.be.a.BadRequestError;
            done();
        });

        it ('rate limits after 10 attempts', function (done) {
            for (var ndx = 0; ndx < 10; ndx = ndx + 1) {
                middleware.spamPrevention.signin(req, null, spyNext);
            }

            middleware.spamPrevention.signin(req, null, spyNext);
            should.exist(error);
            error.should.be.a.UnauthorizedError;

            done();
        });

        it ('allows more attempts after an hour', function (done) {
            var ndx,
                stub = sinon.stub(process, 'hrtime', function () {
                    return [10, 10];
                });

            for (ndx = 0; ndx < 10; ndx = ndx + 1) {
                middleware.spamPrevention.signin(req, null, spyNext);
            }

            middleware.spamPrevention.signin(req, null, spyNext);
            error.should.be.a.UnauthorizedError;
            error = null;

            // fast forward 1 hour
            process.hrtime.restore();
            stub = sinon.stub(process, 'hrtime', function () {
                return [3700000, 10];
            });

            middleware.spamPrevention.signin(req, null, spyNext);
            should(error).equal(undefined);
            spyNext.should.be.calledOnce;

            process.hrtime.restore();
            done();
        });
    });

    describe('forgotten', function () {
        beforeEach(function () {
            req = {
                connection: {
                    remoteAddress: '10.0.0.0'
                },
                body: {
                    passwordreset: [
                        {email:'test@ghost.org'}
                    ]
                }
            };
        });

        it ('send a bad request if no email is specified', function (done) {
            req.body = {
                passwordreset: [{}]
            };

            middleware.spamPrevention.forgotten(req, null, spyNext);
            error.should.be.a.BadRequestError;

            done();
        });

        it ('creates an unauthorized error after 5 attempts with same email', function (done) {
            for (var ndx = 0; ndx < 6; ndx = ndx + 1) {
                middleware.spamPrevention.forgotten(req, null, spyNext);
            }

            middleware.spamPrevention.forgotten(req, null, spyNext);
            error.should.be.a.UnauthorizedError;

            done();
        });

        it ('creates an unauthorized error after 5 attempts from the same ip', function (done) {
            var ndx, email;

            for (ndx = 0; ndx < 6; ndx = ndx + 1) {
                email = 'test' + String(ndx) + '@ghost.org';
                req.body.passwordreset = [
                    {email: email}
                ];

                middleware.spamPrevention.forgotten(req, null, spyNext);
            }

            middleware.spamPrevention.forgotten(req, null, spyNext);
            error.should.be.a.UnauthorizedError;

            done();
        });
    });

    describe('protected', function () {
        var res;

        beforeEach(function () {
            res = sinon.spy();
            req = {
                connection: {
                    remoteAddress: '10.0.0.0'
                },
                body: {
                    password: 'password'
                }
            };
        });

        it ('sets an error when there is no password', function (done) {
            req.body = {};

            middleware.spamPrevention.protected(req, res, spyNext);
            res.error.message.should.equal('No password entered');
            spyNext.should.be.calledOnce;

            done();
        });

        it ('sets and error message after 10 tries', function (done) {
            var ndx;

            for (ndx = 0; ndx < 10; ndx = ndx + 1) {
                middleware.spamPrevention.protected(req, res, spyNext);
            }

            should.not.exist(res.error);
            middleware.spamPrevention.protected(req, res, spyNext);
            should.exist(res.error);
            should.exist(res.error.message);

            done();
        });

        it ('allows more tries after an hour', function (done) {
            var ndx,
                stub = sinon.stub(process, 'hrtime', function () {
                    return [10, 10];
                });

            for (ndx = 0; ndx < 11; ndx = ndx + 1) {
                middleware.spamPrevention.protected(req, res, spyNext);
            }

            should.exist(res.error);
            process.hrtime.restore();
            stub = sinon.stub(process, 'hrtime', function () {
                return [3610000, 10];
            });

            res = sinon.spy();

            middleware.spamPrevention.protected(req, res, spyNext);
            should.not.exist(res.error);

            process.hrtime.restore();
            done();
        });
    });
});
