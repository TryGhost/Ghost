/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should           = require('should'),
    sinon            = require('sinon'),
    Promise          = require('bluebird'),
    testUtils        = require('../../utils'),
    authStrategies   = require('../../../server/middleware/auth-strategies'),
    models           = require('../../../server/models'),
    globalUtils      = require('../../../server/utils');

// To stop jshint complaining
should.equal(true, true);

describe('Auth Strategies', function () {
    var next, sandbox;

    before(testUtils.teardown);

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });
    afterEach(testUtils.teardown);

    describe('Client Password Strategy', function () {
        beforeEach(testUtils.setup('clients'));

        it('should find client', function (done) {
            var clientId = 'ghost-admin',
                clientSecret = 'not_available';

            authStrategies.clientPasswordStrategy(clientId, clientSecret, function () {
                arguments.length.should.eql(2);
                should.equal(arguments[0], null);
                arguments[1].slug.should.eql('ghost-admin');
                done();
            });
        });

        it('shouldn\'t find client with invalid id', function (done) {
            var clientId = 'invalid_id',
                clientSecret = 'not_available';
            authStrategies.clientPasswordStrategy(clientId, clientSecret, next).then(function () {
                next.called.should.be.true;
                next.calledWith(null, false).should.be.true;
                done();
            });
        });

        it('shouldn\'t find client with invalid secret', function (done) {
            var clientId = 'ghost-admin',
                clientSecret = 'invalid_secret';
            authStrategies.clientPasswordStrategy(clientId, clientSecret, next).then(function () {
                next.called.should.be.true;
                next.calledWith(null, false).should.be.true;
                done();
            });
        });
    });

    describe('Bearer Strategy', function () {
        beforeEach(testUtils.setup('users:roles', 'users', 'clients'));

        it('should find user with valid token', function (done) {
            var accessToken = 'valid-token';

            testUtils.fixtures.insertAccessToken({
                user_id: 3,
                token: accessToken,
                client_id: 1,
                expires: Date.now() + globalUtils.ONE_DAY_MS
            }).then(function () {
                authStrategies.bearerStrategy(accessToken, function () {
                    should.equal(arguments[0], null);
                    arguments[1].id.should.eql(3);
                    arguments[2].scope.should.eql('*');
                    done();
                });
            });
        });

        it('shouldn\'t find user with invalid token', function (done) {
            var accessToken = 'invalid_token';

            authStrategies.bearerStrategy(accessToken, next).then(function () {
                next.called.should.be.true;
                next.calledWith(null, false).should.be.true;
                done();
            });
        });

        it('should find user that doesn\'t exist', function (done) {
            var accessToken = 'valid-token';

            // stub needed for mysql, pg
            // this case could only happen in sqlite
            sandbox.stub(models.User, 'forge', function () {
                return {
                    fetch: function () {
                        return Promise.resolve();
                    }
                };
            });

            testUtils.fixtures.insertAccessToken({
                user_id: 3,
                token: accessToken,
                client_id: 1,
                expires: Date.now() + globalUtils.ONE_DAY_MS
            }).then(function () {
                return authStrategies.bearerStrategy(accessToken, next);
            }).then(function () {
                next.called.should.be.true;
                next.calledWith(null, false).should.be.true;
                done();
            });
        });

        it('should find user with expired token', function (done) {
            var accessToken = 'expired-token';

            testUtils.fixtures.insertAccessToken({
                user_id: 3,
                token: accessToken,
                client_id: 1,
                expires: Date.now() - globalUtils.ONE_DAY_MS
            }).then(function () {
                return authStrategies.bearerStrategy(accessToken, next);
            }).then(function () {
                next.called.should.be.true;
                next.calledWith(null, false).should.be.true;
                done();
            });
        });
    });
});
