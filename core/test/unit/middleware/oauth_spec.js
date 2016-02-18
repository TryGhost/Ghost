/*globals describe, before, beforeEach, afterEach, it*/
var sinon            = require('sinon'),
    should           = require('should'),
    Promise          = require('bluebird'),

    oAuth            = require('../../../server/middleware/oauth'),
    Models           = require('../../../server/models');

describe('OAuth', function () {
    var next, req, res, sandbox;

    before(function (done) {
        // Loads all the models
        Models.init().then(done).catch(done);
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = {};
        res = {};
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Generate Token from Password', function () {
        beforeEach(function () {
            sandbox.stub(Models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            sandbox.stub(Models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
        });

        it('Successfully generate access token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Client, 'findOne')
                .withArgs({slug: 'test'}).returns(new Promise.resolve({
                    id: 1
                }));
            sandbox.stub(Models.User, 'check')
                .withArgs({email: 'username', password: 'password'}).returns(new Promise.resolve({
                    id: 1
                }));
            sandbox.stub(Models.Accesstoken, 'add')
                .returns(new Promise.resolve());

            sandbox.stub(Models.Refreshtoken, 'add')
                .returns(new Promise.resolve());

            sandbox.stub(res, 'setHeader', function () {});

            sandbox.stub(res, 'end', function (json) {
                try {
                    should.exist(json);
                    json = JSON.parse(json);
                    json.should.have.property('access_token');
                    json.should.have.property('refresh_token');
                    json.should.have.property('expires_in');
                    json.should.have.property('token_type', 'Bearer');
                    next.called.should.eql(false);
                    done();
                } catch (err) {
                    done(err);
                }
            });
            oAuth.init();
            oAuth.generateAccessToken(req, res, next);
        });

        it('Can\'t generate access token without client.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Client, 'findOne')
                .withArgs({slug: 'test'}).returns(new Promise.resolve());

            oAuth.init();
            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('Handles database error.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Client, 'findOne')
                .withArgs({slug: 'test'}).returns(new Promise.resolve({
                    id: 1
                }));
            sandbox.stub(Models.User, 'check')
                .withArgs({email: 'username', password: 'password'}).returns(new Promise.resolve({
                    id: 1
                }));
            sandbox.stub(Models.Accesstoken, 'add')
                .returns(new Promise.reject({
                    message: 'DB error'
                }));

            oAuth.init();
            oAuth.generateAccessToken(req, res, function (err) {
                err.message.should.eql('DB error');
                done();
            });
        });
    });

    describe('Generate Token from Refreshtoken', function () {
        beforeEach(function () {
            sandbox.stub(Models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            sandbox.stub(Models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
        });

        it('Successfully generate access token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                    toJSON: function () {
                        return {
                            expires: Date.now() + 3600
                        };
                    }
                }));

            sandbox.stub(Models.Accesstoken, 'add')
                .returns(new Promise.resolve());

            sandbox.stub(Models.Refreshtoken, 'edit')
                .returns(new Promise.resolve());

            sandbox.stub(res, 'setHeader', function () {});

            sandbox.stub(res, 'end', function (json) {
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
            oAuth.init();
            oAuth.generateAccessToken(req, res, next);
        });

        it('Can\'t generate access token without valid refresh token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve());

            oAuth.init();
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

            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                    toJSON: function () {
                        return {
                            expires: Date.now() - 3600
                        };
                    }
                }));

            oAuth.init();
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

            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(Models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                    toJSON: function () {
                        return {
                            expires: Date.now() + 3600
                        };
                    }
                }));

            sandbox.stub(Models.Accesstoken, 'add')
                .returns(new Promise.reject({
                    message: 'DB error'
                }));

            oAuth.init();
            oAuth.generateAccessToken(req, res, function (err) {
                err.message.should.eql('DB error');
                done();
            });
        });
    });
});
