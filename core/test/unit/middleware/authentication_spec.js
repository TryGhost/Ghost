/*globals describe, it, beforeEach, afterEach */
var sinon                   = require('sinon'),
    should                  = require('should'),
    passport                = require('passport'),
    rewire                  = require('rewire'),
    configUtils             = require('../../utils/configUtils'),
    errors                  = require('../../../server/errors'),
    auth                    = rewire('../../../server/middleware/auth'),
    BearerStrategy          = require('passport-http-bearer').Strategy,
    ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy,
    user                    = {id: 1},
    info                    = {scope: '*'},
    token                   = 'test_token',
    testClient              = 'test_client',
    testSecret              = 'not_available',
    client                  = {
        id: 2,
        type: 'ua'
    },

    sandbox = sinon.sandbox.create();

should.equal(true, true);

function registerSuccessfulBearerStrategy() {
    // register fake BearerStrategy which always authenticates
    passport.use(new BearerStrategy(
        function strategy(accessToken, done) {
            accessToken.should.eql(token);
            return done(null, user, info);
        }
    ));
}

function registerUnsuccessfulBearerStrategy() {
    // register fake BearerStrategy which always authenticates
    passport.use(new BearerStrategy(
        function strategy(accessToken, done) {
            accessToken.should.eql(token);
            return done(null, false);
        }
    ));
}

function registerFaultyBearerStrategy() {
    // register fake BearerStrategy which always authenticates
    passport.use(new BearerStrategy(
        function strategy(accessToken, done) {
            accessToken.should.eql(token);
            return done('error');
        }
    ));
}

function registerSuccessfulClientPasswordStrategy() {
    // register fake BearerStrategy which always authenticates
    passport.use(new ClientPasswordStrategy(
        function strategy(clientId, clientSecret, done) {
            clientId.should.eql(testClient);
            clientSecret.should.eql('not_available');
            return done(null, client);
        }
    ));
}

function registerUnsuccessfulClientPasswordStrategy() {
    // register fake BearerStrategy which always authenticates
    passport.use(new ClientPasswordStrategy(
        function strategy(clientId, clientSecret, done) {
            clientId.should.eql(testClient);
            clientSecret.should.eql('not_available');
            return done(null, false);
        }
    ));
}

function registerFaultyClientPasswordStrategy() {
    // register fake BearerStrategy which always authenticates
    passport.use(new ClientPasswordStrategy(
        function strategy(clientId, clientSecret, done) {
            clientId.should.eql(testClient);
            clientSecret.should.eql('not_available');
            return done('error');
        }
    ));
}

describe('Auth', function () {
    var res, req, next, errorStub;

    beforeEach(function () {
        req = {};
        res = {};
        next = sandbox.spy();
        errorStub = sandbox.stub(errors, 'logError');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should require authorized user (user exists)', function (done) {
        req.user = {id: 1};

        auth.requiresAuthorizedUser(req, res, next);
        next.called.should.be.true();
        next.calledWith().should.be.true();
        done();
    });

    it('should require authorized user (user is missing)', function (done) {
        req.user = false;
        res.status = {};

        sandbox.stub(res, 'status', function (statusCode) {
            statusCode.should.eql(403);
            return {
                json: function (err) {
                    err.errors[0].errorType.should.eql('NoPermissionError');
                }
            };
        });

        auth.requiresAuthorizedUser(req, res, next);
        next.called.should.be.false();
        done();
    });

    describe('User Authentication', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://my-domain.com'});
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('should authenticate user', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;

            registerSuccessfulBearerStrategy();
            auth.authenticateUser(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, user, info).should.be.true();
            done();
        });

        it('shouldn\'t pass with client, no bearer token', function (done) {
            req.headers = {};
            req.client = {id: 1};
            res.status = {};

            auth.authenticateUser(req, res, next);

            next.called.should.be.true();
            next.calledWith().should.be.true();
            done();
        });

        it('shouldn\'t authenticate user', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            registerUnsuccessfulBearerStrategy();
            auth.authenticateUser(req, res, next);

            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate without bearer token', function (done) {
            req.headers = {};
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            registerUnsuccessfulBearerStrategy();
            auth.authenticateUser(req, res, next);

            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate with bearer token and client', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;
            req.client = {id: 1};
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            registerUnsuccessfulBearerStrategy();
            auth.authenticateUser(req, res, next);

            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate when error', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;

            registerFaultyBearerStrategy();
            auth.authenticateUser(req, res, next);

            next.called.should.be.true();
            next.calledWith('error').should.be.true();
            done();
        });
    });

    describe('Client Authentication', function () {
        it('shouldn\'t require authorized client with bearer token', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;

            auth.authenticateClient(req, res, next);
            next.called.should.be.true();
            next.calledWith().should.be.true();
            done();
        });

        it('shouldn\'t authenticate client with broken bearer token', function (done) {
            req.body = {};
            req.headers = {};
            req.headers.authorization = 'Bearer';
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate client without client_id/client_secret', function (done) {
            req.body = {};
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate client without client_id', function (done) {
            req.body = {};
            req.body.client_secret = testSecret;
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate client without client_secret', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            done();
        });

        it('shouldn\'t authenticate without full client credentials', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            registerUnsuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            errorStub.calledTwice.should.be.true();
            errorStub.getCall(0).args[1].should.eql('Client credentials were not provided');

            done();
        });

        it('shouldn\'t authenticate invalid/unknown client', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            registerUnsuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            errorStub.calledTwice.should.be.true();
            errorStub.getCall(0).args[1].should.eql('Client credentials were not valid');

            done();
        });

        it('shouldn\'t authenticate client with invalid origin', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            req.headers = {};
            req.headers.origin = 'http://invalid.origin.com';
            res.status = {};

            sandbox.stub(res, 'status', function (statusCode) {
                statusCode.should.eql(401);
                return {
                    json: function (err) {
                        err.errors[0].errorType.should.eql('UnauthorizedError');
                    }
                };
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);
            next.called.should.be.false();
            done();
        });

        it('should authenticate valid/known client', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            req.headers = {};
            req.headers.origin = configUtils.config.url;

            res.header = {};

            sandbox.stub(res, 'header', function (key, value) {
                key.should.equal('Access-Control-Allow-Origin');
                value.should.equal(configUtils.config.url);
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('should authenticate client without origin', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;

            res.header = {};

            sandbox.stub(res, 'header', function (key, value) {
                key.should.equal('Access-Control-Allow-Origin');
                value.should.equal(configUtils.config.url);
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('should authenticate client with origin `localhost`', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            req.headers = {};
            req.headers.origin = 'http://localhost';

            res.header = {};

            sandbox.stub(res, 'header', function (key, value) {
                key.should.equal('Access-Control-Allow-Origin');
                value.should.equal('http://localhost');
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('should authenticate client with origin `127.0.0.1`', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            req.headers = {};
            req.headers.origin = 'http://127.0.0.1';

            res.header = {};

            sandbox.stub(res, 'header', function (key, value) {
                key.should.equal('Access-Control-Allow-Origin');
                value.should.equal('http://127.0.0.1');
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('should authenticate client with id in query', function (done) {
            req.body = {};
            req.query = {};
            req.query.client_id = testClient;
            req.query.client_secret = testSecret;
            req.headers = {};
            req.headers.origin = configUtils.config.url;

            res.header = {};

            sandbox.stub(res, 'header', function (key, value) {
                key.should.equal('Access-Control-Allow-Origin');
                value.should.equal(configUtils.config.url);
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('should authenticate client with id + secret in query', function (done) {
            req.body = {};
            req.query = {};
            req.query.client_id = testClient;
            req.query.client_secret = testSecret;
            req.headers = {};
            req.headers.origin = configUtils.config.url;

            res.header = {};

            sandbox.stub(res, 'header', function (key, value) {
                key.should.equal('Access-Control-Allow-Origin');
                value.should.equal(configUtils.config.url);
            });

            registerSuccessfulClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('shouldn\'t authenticate when error', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            res.status = {};

            registerFaultyClientPasswordStrategy();
            auth.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith('error').should.be.true();
            done();
        });
    });
});
