/*globals describe, before, beforeEach, afterEach, it*/
var should           = require('should'),
    sinon            = require('sinon'),
    Promise          = require('bluebird'),

    authStrategies   = require('../../../server/middleware/auth-strategies'),
    Models           = require('../../../server/models'),
    globalUtils      = require('../../../server/utils'),

    sandbox = sinon.sandbox.create(),

    fakeClient =  {
        slug: 'ghost-admin',
        secret: 'not_available',
        status: 'enabled'
    },

    fakeValidToken = {
        user_id: 3,
        token: 'valid-token',
        client_id: 1,
        expires: Date.now() + globalUtils.ONE_DAY_MS
    },
    fakeInvalidToken = {
        user_id: 3,
        token: 'expired-token',
        client_id: 1,
        expires: Date.now() - globalUtils.ONE_DAY_MS
    };

describe('Auth Strategies', function () {
    var next;

    before(function (done) {
        // Loads all the models
        Models.init().then(done).catch(done);
    });

    beforeEach(function () {
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Client Password Strategy', function () {
        var clientStub;

        beforeEach(function () {
            clientStub = sandbox.stub(Models.Client, 'findOne');
            clientStub.returns(new Promise.resolve());
            clientStub.withArgs({slug: fakeClient.slug}).returns(new Promise.resolve({
                toJSON: function () { return fakeClient; }
            }));
        });

        it('should find client', function (done) {
            var clientId = 'ghost-admin',
                clientSecret = 'not_available';

            authStrategies.clientPasswordStrategy(clientId, clientSecret, next).then(function () {
                clientStub.calledOnce.should.be.true();
                clientStub.calledWith({slug: clientId}).should.be.true();
                next.called.should.be.true();
                next.firstCall.args.length.should.eql(2);
                should.equal(next.firstCall.args[0], null);
                next.firstCall.args[1].slug.should.eql(clientId);
                done();
            }).catch(done);
        });

        it('shouldn\'t find client with invalid id', function (done) {
            var clientId = 'invalid_id',
                clientSecret = 'not_available';
            authStrategies.clientPasswordStrategy(clientId, clientSecret, next).then(function () {
                clientStub.calledOnce.should.be.true();
                clientStub.calledWith({slug: clientId}).should.be.true();
                next.called.should.be.true();
                next.calledWith(null, false).should.be.true();
                done();
            }).catch(done);
        });

        it('shouldn\'t find client with invalid secret', function (done) {
            var clientId = 'ghost-admin',
                clientSecret = 'invalid_secret';
            authStrategies.clientPasswordStrategy(clientId, clientSecret, next).then(function () {
                clientStub.calledOnce.should.be.true();
                clientStub.calledWith({slug: clientId}).should.be.true();
                next.called.should.be.true();
                next.calledWith(null, false).should.be.true();
                done();
            }).catch(done);
        });

        it('shouldn\'t auth client that is disabled', function (done) {
            var clientId = 'ghost-admin',
                clientSecret = 'not_available';

            fakeClient.status = 'disabled';

            authStrategies.clientPasswordStrategy(clientId, clientSecret, next).then(function () {
                clientStub.calledOnce.should.be.true();
                clientStub.calledWith({slug: clientId}).should.be.true();
                next.called.should.be.true();
                next.calledWith(null, false).should.be.true();
                done();
            }).catch(done);
        });
    });

    describe('Bearer Strategy', function () {
        var tokenStub, userStub;

        beforeEach(function () {
            tokenStub = sandbox.stub(Models.Accesstoken, 'findOne');
            tokenStub.returns(new Promise.resolve());
            tokenStub.withArgs({token: fakeValidToken.token}).returns(new Promise.resolve({
                toJSON: function () { return fakeValidToken; }
            }));
            tokenStub.withArgs({token: fakeInvalidToken.token}).returns(new Promise.resolve({
                toJSON: function () { return fakeInvalidToken; }
            }));

            userStub = sandbox.stub(Models.User, 'findOne');
            userStub.returns(new Promise.resolve());
            userStub.withArgs({id: 3}).returns(new Promise.resolve({
                toJSON: function () { return {id: 3}; }
            }));
        });

        it('should find user with valid token', function (done) {
            var accessToken = 'valid-token',
                userId = 3;

            authStrategies.bearerStrategy(accessToken, next).then(function () {
                tokenStub.calledOnce.should.be.true();
                tokenStub.calledWith({token: accessToken}).should.be.true();
                userStub.calledOnce.should.be.true();
                userStub.calledWith({id: userId}).should.be.true();
                next.calledOnce.should.be.true();
                next.firstCall.args.length.should.eql(3);
                next.calledWith(null, {id: userId}, {scope: '*'}).should.be.true();
                done();
            }).catch(done);
        });

        it('shouldn\'t find user with invalid token', function (done) {
            var accessToken = 'invalid_token';

            authStrategies.bearerStrategy(accessToken, next).then(function () {
                tokenStub.calledOnce.should.be.true();
                tokenStub.calledWith({token: accessToken}).should.be.true();
                userStub.called.should.be.false();
                next.called.should.be.true();
                next.calledWith(null, false).should.be.true();
                done();
            }).catch(done);
        });

        it('should find user that doesn\'t exist', function (done) {
            var accessToken = 'valid-token',
                userId = 2;

            // override user
            fakeValidToken.user_id = userId;

            authStrategies.bearerStrategy(accessToken, next).then(function () {
                tokenStub.calledOnce.should.be.true();
                tokenStub.calledWith({token: accessToken}).should.be.true();
                userStub.calledOnce.should.be.true();
                userStub.calledWith({id: userId}).should.be.true();
                next.called.should.be.true();
                next.calledWith(null, false).should.be.true();
                done();
            }).catch(done);
        });

        it('should find user with expired token', function (done) {
            var accessToken = 'expired-token';

            authStrategies.bearerStrategy(accessToken, next).then(function () {
                tokenStub.calledOnce.should.be.true();
                tokenStub.calledWith({token: accessToken}).should.be.true();
                userStub.calledOnce.should.be.false();
                next.called.should.be.true();
                next.calledWith(null, false).should.be.true();
                done();
            }).catch(done);
        });
    });
});
