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
        var tokenStub, userStub, userIsActive;

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
                },
                isActive: function () {
                    return userIsActive;
                }
            }));
        });

        it('should find user with valid token', function (done) {
            var accessToken = 'valid-token',
                userId = 3;

            userIsActive = true;

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

        it('should find user with valid token, but user is suspended', function (done) {
            var accessToken = 'valid-token',
                userId = 3;

            userIsActive = false;

            authStrategies.bearerStrategy(accessToken, next).then(function () {
                tokenStub.calledOnce.should.be.true();
                tokenStub.calledWith({token: accessToken}).should.be.true();
                userStub.calledOnce.should.be.true();
                userStub.calledWith({id: userId}).should.be.true();
                next.calledOnce.should.be.true();
                next.firstCall.args.length.should.eql(1);
                (next.firstCall.args[0] instanceof errors.NoPermissionError).should.eql(true);
                next.firstCall.args[0].message.should.eql('Your account was suspended.');
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
        var inviteFindOneStub, userAddStub, userEditStub, userFindOneStub;

        beforeEach(function () {
            userFindOneStub = sandbox.stub(Models.User, 'findOne');
            userAddStub = sandbox.stub(Models.User, 'add');
            userEditStub = sandbox.stub(Models.User, 'edit');
            inviteFindOneStub = sandbox.stub(Models.Invite, 'findOne');
        });

        it('with invite, but with wrong invite token', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {inviteToken: 'wrong'}},
                profile = {email: 'test@example.com', id: '1234'};

            userFindOneStub.returns(Promise.resolve(null));
            inviteFindOneStub.returns(Promise.reject(new errors.NotFoundError()));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, profile, function (err) {
                should.exist(err);
                (err instanceof errors.NotFoundError).should.eql(true);
                userFindOneStub.calledOnce.should.be.false();
                inviteFindOneStub.calledOnce.should.be.true();
                done();
            });
        });

        it('with correct invite token, but expired', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {inviteToken: 'token'}},
                profile = {email: 'test@example.com', id: '1234'};

            userFindOneStub.returns(Promise.resolve(null));
            inviteFindOneStub.returns(Promise.resolve(Models.Invite.forge({
                id: 1,
                token: 'token',
                expires: Date.now() - 1000
            })));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, profile, function (err) {
                should.exist(err);
                (err instanceof errors.NotFoundError).should.eql(true);
                userFindOneStub.calledOnce.should.be.false();
                inviteFindOneStub.calledOnce.should.be.true();
                done();
            });
        });

        it('with correct invite token', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {inviteToken: 'token'}},
                invitedProfile = {email: 'test@example.com', name: 'Wolfram Alpha', id: '1234'},
                invitedUser = {id: 2},
                inviteModel = Models.Invite.forge({
                    id: 1,
                    token: 'token',
                    expires: Date.now() + 2000,
                    role_id: '2'
                });

            sandbox.stub(globalUtils, 'uid').returns('12345678');

            userFindOneStub.returns(Promise.resolve(null));

            userAddStub.withArgs({
                email: invitedProfile.email,
                name: invitedProfile.name,
                password: '12345678',
                roles: [inviteModel.get('role_id')],
                ghost_auth_id: invitedProfile.id,
                ghost_auth_access_token: ghostAuthAccessToken
            }, {
                context: {internal: true}
            }).returns(Promise.resolve(invitedUser));

            userEditStub.returns(Promise.resolve(invitedUser));
            inviteFindOneStub.returns(Promise.resolve(inviteModel));
            sandbox.stub(inviteModel, 'destroy').returns(Promise.resolve());

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, invitedProfile, function (err, user, profile) {
                should.not.exist(err);
                should.exist(user);
                should.exist(profile);
                user.should.eql(invitedUser);
                profile.should.eql(invitedProfile);

                userAddStub.calledOnce.should.be.true();
                userFindOneStub.calledOnce.should.be.false();
                inviteFindOneStub.calledOnce.should.be.true();
                done();
            });
        });

        it('setup', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {}},
                ownerProfile = {email: 'test@example.com', name: 'Wolfram Alpha', id: '1234'},
                owner = {id: 2};

            userFindOneStub.withArgs({ghost_auth_id: ownerProfile.id})
                .returns(Promise.resolve(null));

            userFindOneStub.withArgs({slug: 'ghost-owner', status: 'inactive'})
                .returns(Promise.resolve(_.merge({}, {status: 'inactive'}, owner)));

            userEditStub.withArgs({
                email: ownerProfile.email,
                name: ownerProfile.name,
                slug: null,
                status: 'active',
                ghost_auth_id: ownerProfile.id,
                ghost_auth_access_token: ghostAuthAccessToken
            }, {
                context: {internal: true},
                id: owner.id
            }).returns(Promise.resolve(owner));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, ownerProfile, function (err, user, profile) {
                should.not.exist(err);
                userFindOneStub.calledTwice.should.be.true();
                inviteFindOneStub.calledOnce.should.be.false();
                userEditStub.calledOnce.should.be.true();

                should.exist(user);
                should.exist(profile);
                user.should.eql(owner);
                profile.should.eql(ownerProfile);
                done();
            });
        });

        it('sign in', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {}},
                ownerProfile = {email: 'test@example.com', name: 'Wolfram Alpha', id: '12345'},
                owner = {
                    id: 2, isActive: function () {
                        return true;
                    }
                };

            userFindOneStub.returns(Promise.resolve(owner));
            userEditStub.withArgs({
                email: ownerProfile.email,
                name: ownerProfile.name,
                ghost_auth_access_token: ghostAuthAccessToken,
                ghost_auth_id: ownerProfile.id
            }, {
                context: {internal: true},
                id: owner.id
            }).returns(Promise.resolve(owner));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, ownerProfile, function (err, user, profile) {
                should.not.exist(err);
                userFindOneStub.calledOnce.should.be.true();
                userEditStub.calledOnce.should.be.true();
                inviteFindOneStub.calledOnce.should.be.false();

                should.exist(user);
                should.exist(profile);
                user.should.eql(owner);
                profile.should.eql(ownerProfile);
                done();
            });
        });

        it('sign in, but user is suspended', function (done) {
            var ghostAuthAccessToken = '12345',
                req = {body: {}},
                ownerProfile = {email: 'test@example.com', id: '12345'},
                owner = {
                    id: 2, isActive: function () {
                        return false;
                    }
                };

            userFindOneStub.returns(Promise.resolve(owner));
            userEditStub.withArgs({
                ghost_auth_access_token: ghostAuthAccessToken,
                ghost_auth_id: ownerProfile.id,
                email: ownerProfile.email
            }, {
                context: {internal: true},
                id: owner.id
            }).returns(Promise.resolve(owner));

            authStrategies.ghostStrategy(req, ghostAuthAccessToken, null, ownerProfile, function (err, user, profile) {
                should.exist(err);
                err.message.should.eql('Your account was suspended.');

                userFindOneStub.calledOnce.should.be.true();
                userEditStub.calledOnce.should.be.false();
                inviteFindOneStub.calledOnce.should.be.false();

                should.not.exist(user);
                should.not.exist(profile);
                done();
            });
        });
    });
});
