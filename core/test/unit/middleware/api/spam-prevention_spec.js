var should      = require('should'),
    sinon       = require('sinon'),
    rewire      = require('rewire'),
    spamPrevention = require('../../../../server/middleware/api/spam-prevention');

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
        spamPrevention = rewire('../../../../server/middleware/api/spam-prevention');
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

        it('calls next if refreshing the token', function () {
            req.body.grant_type = 'refresh_token';
            spamPrevention.signin(req, null, next);

            next.calledOnce.should.be.true();
        });

        it ('creates a BadRequestError when there\'s no username', function () {
            req.body = {};

            spamPrevention.signin(req, null, spyNext);

            should.exist(error);
            error.errorType.should.eql('BadRequestError');
        });

        it ('rate limits after 10 attempts', function () {
            for (var ndx = 0; ndx < 10; ndx = ndx + 1) {
                spamPrevention.signin(req, null, spyNext);
            }

            spamPrevention.signin(req, null, spyNext);
            should.exist(error);
            error.errorType.should.eql('TooManyRequestsError');
        });

        it ('allows more attempts after an hour', function () {
            var ndx,
                stub = sinon.stub(process, 'hrtime', function () {
                    return [10, 10];
                });

            for (ndx = 0; ndx < 10; ndx = ndx + 1) {
                spamPrevention.signin(req, null, spyNext);
            }

            spamPrevention.signin(req, null, spyNext);
            error.errorType.should.eql('TooManyRequestsError');
            error = null;

            // fast forward 1 hour
            process.hrtime.restore();
            stub = sinon.stub(process, 'hrtime', function () {
                return [3610, 10];
            });

            spamPrevention.signin(req, null, spyNext);
            should(error).equal(undefined);
            spyNext.called.should.be.true();

            process.hrtime.restore();
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

        it ('send a bad request if no email is specified', function () {
            req.body = {
                passwordreset: [{}]
            };

            spamPrevention.forgotten(req, null, spyNext);
            error.errorType.should.eql('BadRequestError');
        });

        it ('creates an unauthorized error after 5 attempts with same email', function () {
            for (var ndx = 0; ndx < 6; ndx = ndx + 1) {
                spamPrevention.forgotten(req, null, spyNext);
            }

            spamPrevention.forgotten(req, null, spyNext);
            error.errorType.should.eql('TooManyRequestsError');
        });

        it ('creates an unauthorized error after 5 attempts from the same ip', function () {
            var ndx, email;

            for (ndx = 0; ndx < 6; ndx = ndx + 1) {
                email = 'test' + String(ndx) + '@ghost.org';
                req.body.passwordreset = [
                    {email: email}
                ];

                spamPrevention.forgotten(req, null, spyNext);
            }

            spamPrevention.forgotten(req, null, spyNext);
            error.errorType.should.eql('TooManyRequestsError');
        });
    });
});
