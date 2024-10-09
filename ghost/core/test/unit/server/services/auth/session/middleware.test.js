const sessionMiddleware = require('../../../../../../core/server/services/auth').session;
const SessionMiddlware = require('../../../../../../core/server/services/auth/session/middleware');
const models = require('../../../../../../core/server/models');
const sinon = require('sinon');
const should = require('should');
const labs = require('../../../../../../core/shared/labs');

describe('Session Service', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    const fakeReq = function fakeReq() {
        return {
            session: {},
            user: null,
            body: {},
            get() {}
        };
    };

    const fakeRes = function fakeRes() {
        return {
            sendStatus() {}
        };
    };

    describe('createSession', function () {
        it('sets req.session.origin from the Referer header', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sinon.stub(req, 'get')
                .withArgs('user-agent').returns('')
                .withArgs('origin').returns('')
                .withArgs('referrer').returns('http://ghost.org/path');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sinon.stub(res, 'sendStatus')
                .callsFake(function () {
                    should.equal(req.session.origin, 'http://ghost.org');
                    done();
                });

            sessionMiddleware.createSession(req, res);
        });

        it('sets req.session.user_id,origin,user_agent,ip and calls sendStatus with 201 if the check succeeds', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sinon.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld')
                .withArgs('user-agent').returns('bububang');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sinon.stub(res, 'sendStatus')
                .callsFake(function (statusCode) {
                    should.equal(req.session.user_id, 23);
                    should.equal(req.session.origin, 'http://host.tld');
                    should.equal(req.session.user_agent, 'bububang');
                    should.equal(req.session.ip, '127.0.0.1');
                    should.equal(statusCode, 201);
                    done();
                });

            sessionMiddleware.createSession(req, res);
        });

        it('errors with a 403 when signing in while not verified', function (done) {
            sinon.stub(labs, 'isSet').returns(true);
            const req = fakeReq();
            const res = fakeRes();

            sinon.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld')
                .withArgs('user-agent').returns('bububang');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sessionMiddleware.createSession(req, res, (err) => {
                should.equal(err.statusCode, 403);
                should.equal(err.code, '2FA_TOKEN_REQUIRED');
                done();
            });
        });
    });

    describe('logout', function () {
        it('calls next with InternalServerError if removeSessionForUser errors', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            const middleware = SessionMiddlware({
                sessionService: {
                    removeUserForSession: function () {
                        return Promise.reject(new Error('oops'));
                    }
                }
            });

            middleware.logout(req, res, function next(err) {
                should.equal(err.errorType, 'InternalServerError');
                done();
            });
        });

        it('calls sendStatus with 204 if removeUserForSession does not error', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sinon.stub(res, 'sendStatus')
                .callsFake(function (status) {
                    should.equal(status, 204);
                    done();
                });

            const middleware = SessionMiddlware({
                sessionService: {
                    removeUserForSession: function () {
                        return Promise.resolve();
                    }
                }
            });

            middleware.logout(req, res);
        });
    });
});
