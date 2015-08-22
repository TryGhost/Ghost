/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var sinon           = require('sinon'),
    should          = require('should'),
    passport        = require('passport'),
    authenticate    = require('../../../server/middleware/authenticate'),
    BearerStrategy  = require('passport-http-bearer').Strategy,
    user            = {id: 1},
    info            = {scope: '*'},
    token           = 'test_token';

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

describe('authenticate', function () {
    var res, req, next, sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = {};
        res = {};
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should skip authentication if not hitting /ghost', function (done) {
        req.path = '/tag/foo/';
        req.method = 'GET';

        registerSuccessfulBearerStrategy();
        authenticate(req, res, next);

        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should skip authentication if hitting /ghost/api/v0.1/authenticaton/', function (done) {
        req.path = '/ghost/api/v0.1/authentication/';
        req.method = 'GET';

        registerSuccessfulBearerStrategy();
        authenticate(req, res, next);

        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should skip authentication if hitting GET /ghost/api/v0.1/authenticaton/setup/', function (done) {
        req.path = '/ghost/api/v0.1/authentication/setup/';
        req.method = 'GET';

        registerSuccessfulBearerStrategy();
        authenticate(req, res, next);

        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should authentication if hitting PUT /ghost/api/v0.1/authenticaton/setup/', function (done) {
        req.path = '/ghost/api/v0.1/authentication/setup/';
        req.method = 'PUT';
        req.headers = {};
        req.headers.authorization = 'Bearer ' + token;

        registerSuccessfulBearerStrategy();
        authenticate(req, res, next);

        next.called.should.be.true;
        next.calledWith(null, user, info).should.be.true;
        done();
    });

    it('should authenticate if hitting /ghost/api/ endpoint', function (done) {
        req.path = '/ghost/api/v0.1/test/';
        req.method = 'PUT';
        req.headers = {};
        req.headers.authorization = 'Bearer ' + token;

        registerSuccessfulBearerStrategy();
        authenticate(req, res, next);

        next.called.should.be.true;
        next.calledWith(null, user, info).should.be.true;
        done();
    });

    it('shouldn\'t authenticate if hitting /ghost/ auth endpoint with invalid credentials', function (done) {
        res.status = {};
        req.path = '/ghost/api/v0.1/test/';
        req.method = 'PUT';
        req.headers = {};
        req.headers.authorization = 'Bearer ' + token;

        registerUnsuccessfulBearerStrategy();

        // stub res.status for error handling
        sandbox.stub(res, 'status', function (statusCode) {
            statusCode.should.eql(401);
            return {
                json: function (err) {
                    err.errors[0].errorType.should.eql('NoPermissionError');
                }
            };
        });

        authenticate(req, res, next);
        next.called.should.be.false;
        done();
    });
});
