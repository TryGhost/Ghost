var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    _ = require('lodash'),

    authStrategies = require('../../../server/auth/auth-strategies'),
    Models = require('../../../server/models'),
    errors = require('../../../server/errors'),
    globalUtils = require('../../../server/utils'),

    sandbox = sinon.sandbox.create(),

    fakeClient = {
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

    before(function () {
        // Loads all the models
        Models.init();
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
                toJSON: function () {
                    return fakeClient;
                }
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
                toJSON: function () {
                    return fakeValidToken;
                }
            }));
            tokenStub.withArgs({token: fakeInvalidToken.token}).returns(new Promise.resolve({
                toJSON: function () {
                    return fakeInvalidToken;
                }
            }));

            userStub = sandbox.stub(Models.User, 'findOne');
            userStub.returns(new Promise.resolve());
            userStub.withArgs({id: 3}).returns(new Promise.resolve({
                toJSON: function () {
                    return {id: 3};
                }
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

    describe('Ghost Strategy', function () {
        var userByEmailStub, inviteStub, userAddStub, userEditStub, userFindOneStub;

        beforeEach(function () {
            userByEmailStub = sandbox.stub(Models.User, 'getByEmail');
            userFindOneStub = sandbox.stub(Models.User, 'findOne');
            userAddStub = sandbox.stub(Models.User, 'add');
            userEditStub = sandbox.stub(Models.User, 'edit');
            inviteStub = sandbox.stub(Models.Invite, 'findOne');
        });

        it('with invite, but with wrong invite token', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {inviteToken: 'wrong'}},
                profile = {email: 'test@example.com'};

            userByEmailStub.returns(Promise.resolve(null));
            inviteStub.returns(Promise.reject(new errors.NotFoundError()));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, profile, function (err) {
                should.exist(err);
                (err instanceof errors.NotFoundError).should.eql(true);
                userByEmailStub.calledOnce.should.be.true();
                inviteStub.calledOnce.should.be.true();
                done();
            });
        });

        it('with correct invite token, but expired', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {inviteToken: 'token'}},
                profile = {email: 'test@example.com'};

            userByEmailStub.returns(Promise.resolve(null));
            inviteStub.returns(Promise.resolve(Models.Invite.forge({
                id: 1,
                token: 'token',
                expires: Date.now() - 1000
            })));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, profile, function (err) {
                should.exist(err);
                (err instanceof errors.NotFoundError).should.eql(true);
                userByEmailStub.calledOnce.should.be.true();
                inviteStub.calledOnce.should.be.true();
                done();
            });
        });

        it('with correct invite token', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {inviteToken: 'token'}},
                invitedProfile = {email: 'test@example.com'},
                invitedUser = {id: 2},
                inviteModel = Models.Invite.forge({
                    id: 1,
                    token: 'token',
                    expires: Date.now() + 1000
                });

            userByEmailStub.returns(Promise.resolve(null));
            userAddStub.returns(Promise.resolve(invitedUser));
            userEditStub.returns(Promise.resolve(invitedUser));
            inviteStub.returns(Promise.resolve(inviteModel));
            sandbox.stub(inviteModel, 'destroy').returns(Promise.resolve());

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, invitedProfile, function (err, user, profile) {
                should.not.exist(err);
                should.exist(user);
                should.exist(profile);
                user.should.eql(invitedUser);
                profile.should.eql(invitedProfile);

                userByEmailStub.calledOnce.should.be.true();
                inviteStub.calledOnce.should.be.true();
                done();
            });
        });

        it('setup', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {}},
                ownerProfile = {email: 'test@example.com'},
                owner = {id: 2};

            userByEmailStub.returns(Promise.resolve(null));
            userFindOneStub.returns(Promise.resolve(_.merge({}, {status: 'inactive'}, owner)));
            userEditStub.withArgs({status: 'active', email: 'test@example.com'}, {
                context: {internal: true},
                id: owner.id
            }).returns(Promise.resolve(owner));

            userEditStub.withArgs({ghost_auth_access_token: ghostAuthAccessToken}, {
                context: {internal: true},
                id: owner.id
            }).returns(Promise.resolve(owner));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, ownerProfile, function (err, user, profile) {
                should.not.exist(err);
                userByEmailStub.calledOnce.should.be.true();
                inviteStub.calledOnce.should.be.false();

                should.exist(user);
                should.exist(profile);
                user.should.eql(owner);
                profile.should.eql(ownerProfile);
                done();
            });
        });

        it('auth', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {}},
                ownerProfile = {email: 'test@example.com'},
                owner = {id: 2};

            userByEmailStub.returns(Promise.resolve(owner));
            userEditStub.withArgs({ghost_auth_access_token: ghostAuthAccessToken}, {
                context: {internal: true},
                id: owner.id
            }).returns(Promise.resolve(owner));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, ownerProfile, function (err, user, profile) {
                should.not.exist(err);
                userByEmailStub.calledOnce.should.be.true();
                userEditStub.calledOnce.should.be.true();
                inviteStub.calledOnce.should.be.false();

                should.exist(user);
                should.exist(profile);
                user.should.eql(owner);
                profile.should.eql(ownerProfile);
                done();
            });
        });
    });
});
