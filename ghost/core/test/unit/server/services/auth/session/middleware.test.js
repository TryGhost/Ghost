const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const sinon = require('sinon');

const sessionMiddleware = require('../../../../../../core/server/services/auth').session;
const SessionMiddleware = require('../../../../../../core/server/services/auth/session/middleware');
const models = require('../../../../../../core/server/models');

describe('Session Service', function () {
    afterEach(function () {
        sinon.restore();
    });

    const createApp = function createApp(middleware, options = {}) {
        const app = express();
        app.set('trust proxy', true);
        app.use(express.json());
        app.use(function setupRequest(req, res, next) {
            req.session = options.session || {};
            req.user = options.user || null;
            next();
        });
        app.post('/', middleware);
        app.use(function errorHandler(err, _req, res, next) {
            if (res.headersSent) {
                return next(err);
            }

            res.status(err.statusCode || err.status || 500).json({
                code: err.code,
                errorType: err.errorType,
                message: err.message,
                statusCode: err.statusCode
            });
        });

        return app;
    };

    describe('createSession', function () {
        it('sets req.session.origin from the Referer header', async function () {
            const session = {};
            const user = models.User.forge({id: 23});
            const app = createApp(sessionMiddleware.createSession, {session, user});

            await request(app)
                .post('/')
                .set('Referer', 'http://ghost.org/path')
                .set('X-Forwarded-For', '127.0.0.1')
                .expect(201);

            assert.equal(session.origin, 'http://ghost.org');
        });

        it('sets req.session.user_id,origin,user_agent,ip and returns 201 if the check succeeds', async function () {
            const session = {};
            const user = models.User.forge({id: 23});
            const app = createApp(sessionMiddleware.createSession, {session, user});

            await request(app)
                .post('/')
                .set('Origin', 'http://host.tld')
                .set('User-Agent', 'bububang')
                .set('X-Forwarded-For', '127.0.0.1')
                .expect(201);

            assert.equal(session.user_id, 23);
            assert.equal(session.origin, 'http://host.tld');
            assert.equal(session.user_agent, 'bububang');
            assert.equal(session.ip, '127.0.0.1');
        });

        it('errors with a 403 when signing in while not verified', async function () {
            const user = models.User.forge({id: 23});
            const createSessionForUserStub = sinon.stub().resolves();
            const isVerifiedSessionStub = sinon.stub().resolves(false);
            const sendAuthCodeToUserStub = sinon.stub().resolves();
            const middleware = SessionMiddleware({
                sessionService: {
                    createSessionForUser: createSessionForUserStub,
                    isVerifiedSession: isVerifiedSessionStub,
                    sendAuthCodeToUser: sendAuthCodeToUserStub,
                    isVerificationRequired: function () {
                        return false;
                    }
                }
            });
            const app = createApp(middleware.createSession, {user});

            const {body} = await request(app)
                .post('/')
                .set('Origin', 'http://host.tld')
                .set('User-Agent', 'bububang')
                .set('X-Forwarded-For', '127.0.0.1')
                .expect(403);

            sinon.assert.calledOnce(createSessionForUserStub);
            sinon.assert.calledOnce(isVerifiedSessionStub);
            sinon.assert.calledOnce(sendAuthCodeToUserStub);
            assert.equal(createSessionForUserStub.firstCall.args[2], user);
            assert.equal(body.statusCode, 403);
            assert.equal(body.code, '2FA_NEW_DEVICE_DETECTED');
        });

        it('errors with a 403 when require_email_mfa is true', async function () {
            const user = models.User.forge({id: 23});
            const createSessionForUserStub = sinon.stub().resolves();
            const isVerifiedSessionStub = sinon.stub().resolves(false);
            const sendAuthCodeToUserStub = sinon.stub().resolves();
            const middleware = SessionMiddleware({
                sessionService: {
                    createSessionForUser: createSessionForUserStub,
                    isVerifiedSession: isVerifiedSessionStub,
                    sendAuthCodeToUser: sendAuthCodeToUserStub,
                    isVerificationRequired: function () {
                        return true;
                    }
                }
            });
            const app = createApp(middleware.createSession, {user});

            const {body} = await request(app)
                .post('/')
                .set('Origin', 'http://host.tld')
                .set('User-Agent', 'bububang')
                .set('X-Forwarded-For', '127.0.0.1')
                .expect(403);

            sinon.assert.calledOnce(createSessionForUserStub);
            sinon.assert.calledOnce(isVerifiedSessionStub);
            sinon.assert.calledOnce(sendAuthCodeToUserStub);
            assert.equal(createSessionForUserStub.firstCall.args[2], user);
            assert.equal(body.statusCode, 403);
            assert.equal(body.code, '2FA_TOKEN_REQUIRED');
        });
    });

    describe('logout', function () {
        it('returns 500 if removeSessionForUser errors', async function () {
            const removeUserForSessionStub = sinon.stub().rejects(new Error('oops'));
            const middleware = SessionMiddleware({
                sessionService: {
                    removeUserForSession: removeUserForSessionStub
                }
            });
            const app = createApp(middleware.logout);

            const {body} = await request(app)
                .post('/')
                .expect(500);

            sinon.assert.calledOnce(removeUserForSessionStub);
            assert.equal(body.errorType, 'InternalServerError');
        });

        it('returns 204 if removeUserForSession does not error', async function () {
            const removeUserForSessionStub = sinon.stub().resolves();
            const middleware = SessionMiddleware({
                sessionService: {
                    removeUserForSession: removeUserForSessionStub
                }
            });
            const app = createApp(middleware.logout);

            await request(app)
                .post('/')
                .expect(204);

            sinon.assert.calledOnce(removeUserForSessionStub);
        });
    });

    describe('sendAuthCode', function () {
        it('sends an auth code to the user', async function () {
            const sendAuthCodeToUserStub = sinon.stub().resolves(123);
            const middleware = SessionMiddleware({
                sessionService: {
                    sendAuthCodeToUser: sendAuthCodeToUserStub
                }
            });
            const app = createApp(middleware.sendAuthCode);

            await request(app)
                .post('/')
                .expect(200);

            sinon.assert.calledOnce(sendAuthCodeToUserStub);
        });

        it('returns 500 if sendAuthCodeToUser fails', async function () {
            const sendAuthCodeToUserStub = sinon.stub().rejects(new Error('foo bar baz'));
            const middleware = SessionMiddleware({
                sessionService: {
                    sendAuthCodeToUser: sendAuthCodeToUserStub
                }
            });
            const app = createApp(middleware.sendAuthCode);

            const {body} = await request(app)
                .post('/')
                .expect(500);

            sinon.assert.calledOnce(sendAuthCodeToUserStub);
            assert.equal(body.message, 'foo bar baz');
        });
    });

    describe('verifyAuthCode', function () {
        it('returns 200 if the auth code is valid', async function () {
            const verifyAuthCodeForUserStub = sinon.stub().resolves(true);
            const verifySessionStub = sinon.stub().resolves(true);
            const middleware = SessionMiddleware({
                sessionService: {
                    verifyAuthCodeForUser: verifyAuthCodeForUserStub,
                    verifySession: verifySessionStub
                }
            });
            const app = createApp(middleware.verifyAuthCode);

            await request(app)
                .post('/')
                .expect(200);

            sinon.assert.calledOnce(verifyAuthCodeForUserStub);
            sinon.assert.calledOnce(verifySessionStub);
        });

        it('returns 401 if the auth code is invalid', async function () {
            const verifyAuthCodeForUserStub = sinon.stub().resolves(false);
            const middleware = SessionMiddleware({
                sessionService: {
                    verifyAuthCodeForUser: verifyAuthCodeForUserStub
                }
            });
            const app = createApp(middleware.verifyAuthCode);

            await request(app)
                .post('/')
                .expect(401);

            sinon.assert.calledOnce(verifyAuthCodeForUserStub);
        });

        it('returns 500 if verifyAuthCodeForUser fails', async function () {
            const verifyAuthCodeForUserStub = sinon.stub().rejects(new Error('foo bar baz'));
            const middleware = SessionMiddleware({
                sessionService: {
                    verifyAuthCodeForUser: verifyAuthCodeForUserStub
                }
            });
            const app = createApp(middleware.verifyAuthCode);

            const {body} = await request(app)
                .post('/')
                .expect(500);

            sinon.assert.calledOnce(verifyAuthCodeForUserStub);
            assert.equal(body.message, 'foo bar baz');
        });
    });
});
