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

        it('errors with a 403 when signing in while not verified', async function () {
            sinon.stub(labs, 'isSet').returns(true);
            const req = fakeReq();
            const res = fakeRes();
            const next = sinon.stub();
            sinon.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld')
                .withArgs('user-agent').returns('bububang');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            const middleware = SessionMiddlware({
                sessionService: {
                    createSessionForUser: function () {
                        return Promise.resolve();
                    },
                    isVerifiedSession: function () {
                        return Promise.resolve(false);
                    },
                    sendAuthCodeToUser: function () {
                        return Promise.resolve();
                    },
                    isVerificationRequired: function () {
                        return false;
                    }
                }
            });

            await middleware.createSession(req, res, next);
            should.equal(next.callCount, 1);
            should.equal(next.args[0][0].statusCode, 403);
            should.equal(next.args[0][0].code, '2FA_NEW_DEVICE_DETECTED');
        });

        it('errors with a 403 when require_email_mfa is true', async function () {
            sinon.stub(labs, 'isSet').returns(true);
            const req = fakeReq();
            const res = fakeRes();
            const next = sinon.stub();

            sinon.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld')
                .withArgs('user-agent').returns('bububang');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            const middleware = SessionMiddlware({
                sessionService: {
                    createSessionForUser: function () {
                        return Promise.resolve();
                    },
                    isVerifiedSession: function () {
                        return Promise.resolve(false);
                    },
                    sendAuthCodeToUser: function () {
                        return Promise.resolve();
                    },
                    isVerificationRequired: function () {
                        return true;
                    }
                }
            });

            await middleware.createSession(req, res, next);
            should.equal(next.callCount, 1);
            should.equal(next.args[0][0].statusCode, 403);
            should.equal(next.args[0][0].code, '2FA_TOKEN_REQUIRED');
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

    describe('sendAuthCode', function () {
        it('sends an auth code to the user', async function () {
            const req = fakeReq();
            const res = fakeRes();

            const sendAuthCodeToUserStub = sinon.stub().resolves(123);
            const nextStub = sinon.stub();
            const sendStatusStub = sinon.stub(res, 'sendStatus');

            const middleware = SessionMiddlware({
                sessionService: {
                    sendAuthCodeToUser: sendAuthCodeToUserStub
                }
            });

            await middleware.sendAuthCode(req, res, nextStub);

            should.equal(sendAuthCodeToUserStub.callCount, 1);
            should.equal(nextStub.callCount, 0);
            should.equal(sendStatusStub.callCount, 1);
            should.equal(sendStatusStub.args[0][0], 200);
        });

        it('calls next with an error if sendAuthCodeToUser fails', async function () {
            const req = fakeReq();
            const res = fakeRes();

            const sendAuthCodeToUserStub = sinon.stub().rejects(new Error('foo bar baz'));
            const nextStub = sinon.stub();
            const sendStatusStub = sinon.stub(res, 'sendStatus');

            const middleware = SessionMiddlware({
                sessionService: {
                    sendAuthCodeToUser: sendAuthCodeToUserStub
                }
            });

            await middleware.sendAuthCode(req, res, nextStub);

            should.equal(sendAuthCodeToUserStub.callCount, 1);
            should.equal(nextStub.callCount, 1);
            should.equal(sendStatusStub.callCount, 0);
        });
    });

    describe('verifyAuthCode', function () {
        it('returns 200 if the auth code is valid', async function () {
            const req = fakeReq();
            const res = fakeRes();

            const verifyAuthCodeForUserStub = sinon.stub().resolves(true);
            const nextStub = sinon.stub();
            const sendStatusStub = sinon.stub(res, 'sendStatus');

            const middleware = SessionMiddlware({
                sessionService: {
                    verifyAuthCodeForUser: verifyAuthCodeForUserStub,
                    verifySession: sinon.stub().resolves(true)
                }
            });

            await middleware.verifyAuthCode(req, res, nextStub);

            should.equal(verifyAuthCodeForUserStub.callCount, 1);
            should.equal(nextStub.callCount, 0);
            should.equal(sendStatusStub.callCount, 1);
            should.equal(sendStatusStub.args[0][0], 200);
        });

        it('returns 401 if the auth code is invalid', async function () {
            const req = fakeReq();
            const res = fakeRes();

            const verifyAuthCodeForUserStub = sinon.stub().resolves(false);
            const nextStub = sinon.stub();
            const sendStatusStub = sinon.stub(res, 'sendStatus');

            const middleware = SessionMiddlware({
                sessionService: {
                    verifyAuthCodeForUser: verifyAuthCodeForUserStub
                }
            });

            await middleware.verifyAuthCode(req, res, nextStub);

            should.equal(verifyAuthCodeForUserStub.callCount, 1);
            should.equal(nextStub.callCount, 0);
            should.equal(sendStatusStub.callCount, 1);
            should.equal(sendStatusStub.args[0][0], 401);
        });

        it('calls next with an error if sendAuthCodeToUser fails', async function () {
            const req = fakeReq();
            const res = fakeRes();

            const verifyAuthCodeForUserStub = sinon.stub().rejects(new Error('foo bar baz'));
            const nextStub = sinon.stub();
            const sendStatusStub = sinon.stub(res, 'sendStatus');

            const middleware = SessionMiddlware({
                sessionService: {
                    verifyAuthCodeForUser: verifyAuthCodeForUserStub
                }
            });

            await middleware.verifyAuthCode(req, res, nextStub);

            should.equal(verifyAuthCodeForUserStub.callCount, 1);
            should.equal(nextStub.callCount, 1);
            should.equal(sendStatusStub.callCount, 0);
        });
    });
});
