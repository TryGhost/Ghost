const should = require('should');
const sinon = require('sinon');
const passport = require('passport');
const BearerStrategy = require('passport-http-bearer').Strategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const auth = require('../../../../server/services/auth');
const common = require('../../../../server/lib/common');
const models = require('../../../../server/models');
const labs = require('../../../../server/services/labs');
const user = {id: 1};
const info = {scope: '*'};
const token = 'test_token';
const testClient = 'test_client';
const testSecret = 'not_available';
const client = {
    id: 2,
    type: 'ua'
};

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
    var res, req, next, loggingStub;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        req = {};
        res = {};
        next = sinon.spy();
        loggingStub = sinon.stub(common.logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should require authorized user (user exists)', function (done) {
        req.user = {id: 1};

        auth.authorize.requiresAuthorizedUser(req, res, next);
        next.called.should.be.true();
        next.calledWith().should.be.true();
        done();
    });

    it('should require authorized user (user is missing)', function (done) {
        req.user = false;
        res.status = {};

        var next = function next(err) {
            err.statusCode.should.eql(403);
            (err instanceof common.errors.NoPermissionError).should.eql(true);
            done();
        };

        auth.authorize.requiresAuthorizedUser(req, res, next);
    });

    describe('User Authentication', function () {
        it('should authenticate user', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;

            registerSuccessfulBearerStrategy();
            auth.authenticate.authenticateUser(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, user, info).should.be.true();
            done();
        });

        it('shouldn\'t pass with client, no bearer token', function (done) {
            req.headers = {};
            req.client = {id: 1};
            res.status = {};

            auth.authenticate.authenticateUser(req, res, next);

            next.called.should.be.true();
            next.calledWith().should.be.true();
            done();
        });

        it('shouldn\'t authenticate user', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            registerUnsuccessfulBearerStrategy();
            auth.authenticate.authenticateUser(req, res, next);
        });

        it('shouldn\'t authenticate without bearer token', function (done) {
            req.headers = {};
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            registerUnsuccessfulBearerStrategy();
            auth.authenticate.authenticateUser(req, res, next);
        });

        it('shouldn\'t authenticate with bearer token and client', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;
            req.client = {id: 1};
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            registerUnsuccessfulBearerStrategy();
            auth.authenticate.authenticateUser(req, res, next);
        });

        it('shouldn\'t authenticate when error', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;

            registerFaultyBearerStrategy();
            auth.authenticate.authenticateUser(req, res, next);

            next.called.should.be.true();
            next.calledWith('error').should.be.true();
            done();
        });
    });

    describe('Client Authentication', function () {
        beforeEach(function () {
            sinon.stub(labs, 'isSet').withArgs('publicAPI').returns(true);
        });

        it('shouldn\'t require authorized client with bearer token', function (done) {
            req.headers = {};
            req.headers.authorization = 'Bearer ' + token;

            auth.authenticate.authenticateClient(req, res, next);
            next.called.should.be.true();
            next.calledWith().should.be.true();
            done();
        });

        it('shouldn\'t authenticate client with broken bearer token', function (done) {
            req.body = {};
            req.headers = {};
            req.headers.authorization = 'Bearer';
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            auth.authenticate.authenticateClient(req, res, next);
        });

        it('shouldn\'t authenticate client without client_id/client_secret', function (done) {
            req.body = {};
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            auth.authenticate.authenticateClient(req, res, next);
        });

        it('shouldn\'t authenticate client without client_id', function (done) {
            req.body = {};
            req.body.client_secret = testSecret;
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            auth.authenticate.authenticateClient(req, res, next);
        });

        it('shouldn\'t authenticate client without client_secret', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            auth.authenticate.authenticateClient(req, res, next);
        });

        it('shouldn\'t authenticate without full client credentials', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            registerUnsuccessfulClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);
        });

        it('shouldn\'t authenticate invalid/unknown client', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            res.status = {};

            var next = function next(err) {
                err.statusCode.should.eql(401);
                (err instanceof common.errors.UnauthorizedError).should.eql(true);
                done();
            };

            registerUnsuccessfulClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);
        });

        it('should authenticate valid/known client', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            req.headers = {};

            registerSuccessfulClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);

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

            registerSuccessfulClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);

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

            registerSuccessfulClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith(null, client).should.be.true();
            done();
        });

        it('shouldn\'t authenticate when publicAPI is disabled', function (done) {
            labs.isSet.restore();
            sinon.stub(labs, 'isSet').withArgs('publicAPI').returns(false);

            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            req.headers = {};

            var next = function next(err) {
                err.statusCode.should.eql(403);
                (err instanceof common.errors.NoPermissionError).should.eql(true);
                done();
            };

            registerSuccessfulClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);
        });

        it('shouldn\'t authenticate when error', function (done) {
            req.body = {};
            req.body.client_id = testClient;
            req.body.client_secret = testSecret;
            res.status = {};

            registerFaultyClientPasswordStrategy();
            auth.authenticate.authenticateClient(req, res, next);

            next.called.should.be.true();
            next.calledWith('error').should.be.true();
            done();
        });
    });
});
