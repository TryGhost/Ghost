var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    passport = require('passport'),
    testUtils = require('../../../utils'),
    oAuth = require('../../../../server/services/auth/oauth'),
    authUtils = require('../../../../server/services/auth/utils'),
    spamPrevention = require('../../../../server/web/middleware/api/spam-prevention'),
    common = require('../../../../server/lib/common'),
    models = require('../../../../server/models'),

    sandbox = sinon.sandbox.create();

describe('OAuth', function () {
    var next, req, res;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        req = {};
        res = {};
        next = sandbox.spy();

        sandbox.stub(spamPrevention.userLogin(), 'reset');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Generate Token from Password', function () {
        beforeEach(function () {
            sandbox.stub(models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            sandbox.stub(models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            oAuth.init();
        });

        it('Successfully generate access token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};

            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            req.client = {
                id: 1
            };

            res.setHeader = function () {
            };
            res.end = function () {
            };

            sandbox.stub(models.User, 'check')
                .withArgs({email: 'username', password: 'password'}).returns(Promise.resolve({
                id: 1
            }));

            sandbox.stub(authUtils, 'createTokens')
                .returns(Promise.resolve({
                    access_token: 'AT',
                    refresh_token: 'RT',
                    expires_in: Date.now() + 1000
                }));

            sandbox.stub(res, 'setHeader').callsFake(function () {
            });

            sandbox.stub(res, 'end').callsFake(function (json) {
                try {
                    should.exist(json);
                    json = JSON.parse(json);
                    json.should.have.property('access_token');
                    json.should.have.property('refresh_token');
                    json.should.have.property('expires_in');
                    json.should.have.property('token_type', 'Bearer');
                    next.called.should.eql(false);
                    spamPrevention.userLogin().reset.called.should.eql(true);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            oAuth.generateAccessToken(req, res, next);
        });

        it('Can\'t generate access token without client.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('UnauthorizedError');
                done();
            });
        });

        it('Can\'t generate access token without username.', function (done) {
            req.body = {};

            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'password';
            req.body.password = 'password';

            res.setHeader = {};
            res.end = {};

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('BadRequestError');
                done();
            });
        });

        it('Can\'t generate access token without password.', function (done) {
            req.body = {};

            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'password';
            req.body.username = 'username';

            res.setHeader = {};
            res.end = {};

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('BadRequestError');
                done();
            });
        });

        it('Handles database error.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            req.client = {
                id: 1
            };
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.User, 'check')
                .withArgs({email: 'username', password: 'password'}).returns(new Promise.resolve({
                id: 1
            }));

            sandbox.stub(authUtils, 'createTokens')
                .returns(new Promise.reject({
                    message: 'DB error'
                }));

            oAuth.generateAccessToken(req, res, function (err) {
                err.message.should.eql('DB error');
                done();
            });
        });
    });

    describe('Generate Token from Refreshtoken', function () {
        beforeEach(function () {
            sandbox.stub(models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            sandbox.stub(models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());

            oAuth.init();
        });

        it('Successfully generate access token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.authInfo = {ip: '127.0.0.1'};
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = function () {
            };
            res.end = function () {
            };

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                toJSON: function () {
                    return {
                        expires: Date.now() + 3600
                    };
                }
            }));

            sandbox.stub(authUtils, 'createTokens')
                .returns(new Promise.resolve({
                    access_token: 'AT',
                    refresh_token: 'RT',
                    expires_in: Date.now() + 1000
                }));

            sandbox.stub(res, 'setHeader').callsFake(function () {
            });

            sandbox.stub(res, 'end').callsFake(function (json) {
                try {
                    should.exist(json);
                    json = JSON.parse(json);
                    json.should.have.property('access_token');
                    json.should.have.property('expires_in');
                    json.should.have.property('token_type', 'Bearer');
                    next.called.should.eql(false);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            oAuth.generateAccessToken(req, res, next);
        });

        it('Can\'t generate access token without valid refresh token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve());

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('Can\'t generate access token with expired refresh token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                toJSON: function () {
                    return {
                        expires: Date.now() - 3600
                    };
                }
            }));

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('UnauthorizedError');
                done();
            });
        });

        it('Handles database error.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                toJSON: function () {
                    return {
                        expires: Date.now() + 3600
                    };
                }
            }));

            sandbox.stub(authUtils, 'createTokens').callsFake(function () {
                return Promise.reject(new Error('DB error'));
            });

            oAuth.generateAccessToken(req, res, function (err) {
                err.stack.should.containEql('DB error');
                done();
            });
        });
    });

    describe('Generate Token from Authorization Code', function () {
        beforeEach(function () {
            sandbox.stub(models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());

            sandbox.stub(models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());

            oAuth.init();
        });

        it('Successfully generate access token.', function (done) {
            var user = new models.User(testUtils.DataGenerator.forKnex.createUser());

            req.body = {};
            req.query = {};
            req.client = {
                id: 1
            };
            req.authInfo = {ip: '127.0.0.1'};
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'authorization_code';
            req.body.authorizationCode = '1234';

            res.json = function (data) {
                data.access_token.should.eql('access-token');
                data.refresh_token.should.eql('refresh-token');
                data.expires_in.should.eql(10);
                done();
            };

            sandbox.stub(authUtils, 'createTokens')
                .returns(new Promise.resolve({
                    access_token: 'access-token',
                    refresh_token: 'refresh-token',
                    expires_in: 10
                }));

            sandbox.stub(passport, 'authenticate').callsFake(function (name, options, onSuccess) {
                return function () {
                    onSuccess(null, user);
                };
            });

            oAuth.generateAccessToken(req, res, next);
        });

        it('Error: ghost.org', function (done) {
            req.body = {};
            req.query = {};
            req.client = {
                id: 1
            };

            req.authInfo = {ip: '127.0.0.1'};
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'authorization_code';
            req.body.authorizationCode = '1234';

            sandbox.stub(passport, 'authenticate').callsFake(function (name, options, onSuccess) {
                return function () {
                    onSuccess(new common.errors.UnauthorizedError());
                };
            });

            oAuth.generateAccessToken(req, res, function (err) {
                should.exist(err);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            });
        });

        it('Error: no authorization_code provided', function (done) {
            req.body = {};
            req.query = {};
            req.client = {
                id: 1
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'authorization_code';

            oAuth.generateAccessToken(req, res, function (err) {
                should.exist(err);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            });
        });
    });
});
