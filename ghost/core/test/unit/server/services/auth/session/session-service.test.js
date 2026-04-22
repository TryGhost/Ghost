const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const sinon = require('sinon');
const express = require('express');
const SessionService = require('../../../../../../core/server/services/auth/session/session-service');

describe('SessionService', function () {
    let getSettingsCache;
    let urlUtils;

    beforeEach(function () {
        getSettingsCache = sinon.stub();
        getSettingsCache.withArgs('require_email_mfa').returns(false);
        getSettingsCache.withArgs('title').returns('Test Title');
        getSettingsCache.withArgs('admin_session_secret').returns('secret-key');
        urlUtils = {
            getAdminUrl: sinon.stub().returns('https://admin.example.com'),
            getSiteUrl: sinon.stub().returns('https://example.com'),
            urlFor: sinon.stub().returns('https://example.com')
        };
    });

    it('Returns the user for the id stored on the session', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        await sessionService.createSessionForUser(req, res, user);

        assert.equal(req.session.user_id, 'egg');

        const actualUser = await sessionService.getUserForSession(req, res);
        sinon.assert.calledWith(findUserById, sinon.match({id: 'egg'}));

        const expectedUser = await findUserById.returnValues[0];
        assert.equal(actualUser, expectedUser);

        await sessionService.removeUserForSession(req, res);
        assert.equal(req.session.user_id, undefined);

        const removedUser = await sessionService.getUserForSession(req, res);
        assert.equal(removedUser, null);
    });

    it('Throws an error when the csrf verification fails due to non-admin origin', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                origin: 'https://admin.example.com'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://evil.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://evil.com'
            }
        });
        const res = Object.create(express.response);

        await assert.rejects(
            sessionService.getUserForSession(req, res),
            {message: `Request made from incorrect origin. Expected 'https://admin.example.com' received 'https://evil.com'.`}
        );
    });

    it('Doesn\'t throw an error when the csrf verification fails when bypassed', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                origin: 'https://admin.example.com'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://other.example.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://other.example.com'
            }
        });
        const res = Object.create(express.response);
        res.locals = {
            bypassCsrfProtection: true
        };

        await sessionService.getUserForSession(req, res);
    });

    it('Can verify a user session', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        await sessionService.createSessionForUser(req, res, user);
        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, undefined);

        await sessionService.verifySession(req, res);
        assert.equal(req.session.verified, true);

        await sessionService.removeUserForSession(req, res);
        assert.equal(req.session.user_id, undefined);
        assert.equal(req.session.verified, true);

        await sessionService.createSessionForUser(req, res, user);
        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, true);
    });

    it('#createSessionForUser verifies session when valid token is provided on request', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        // Generate a valid token for the same session challenge
        req.session = {user_id: 'egg'};
        const validToken = await sessionService.generateAuthCodeForUser(req, res);

        // Now create session with token on request body
        req.body = {token: validToken};
        await sessionService.createSessionForUser(req, res, user);

        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, true);
    });

    it('#createSessionForUser does not verify session when invalid token is provided on request', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        // Provide an invalid token on request body
        req.body = {token: '000000'};
        await sessionService.createSessionForUser(req, res, user);

        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, undefined);
    });

    it('#createSessionForUser does not verify session when token belongs to a different session challenge', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        // Generate token from a different challenge/session context
        const tokenReq = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        tokenReq.session = {user_id: 'egg'};
        const validTokenForOtherSession = await sessionService.generateAuthCodeForUser(tokenReq, res);

        req.body = {token: validTokenForOtherSession};
        await sessionService.createSessionForUser(req, res, user);

        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, undefined);
    });

    it('Generates a valid auth code and verifies it correctly', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb()),
                user_id: 'user-123',
                origin: 'https://admin.example.com'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'Fake'
            }
        });
        const res = Object.create(express.response);

        // Generate the auth code
        const authCode = await sessionService.generateAuthCodeForUser(req, res);
        assertExists(authCode);

        req.body = {
            token: authCode
        };

        // Verify the auth code
        const isValid = await sessionService.verifyAuthCodeForUser(req, res);
        assert.equal(isValid, true);

        // A code can only be used once
        const isValidOnSecondUse = await sessionService.verifyAuthCodeForUser(req, res);
        assert.equal(isValidOnSecondUse, false);
    });

    it('Fails to verify an incorrect auth code', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb()),
                user_id: 'user-123',
                origin: 'https://admin.example.com'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'Fake'
            }
        });
        const res = Object.create(express.response);

        // Generate the auth code
        const authCode = await sessionService.generateAuthCodeForUser(req, res);
        assertExists(authCode);

        req.body = {
            token: 'wrong-code'
        };

        // Verify an incorrect auth code
        const isValid = await sessionService.verifyAuthCodeForUser(req, res);
        assert.equal(isValid, false);
    });

    it('Generates a different auth code for a different secret', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb()),
                user_id: 'user-123'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);

        // Test for first secret
        const getSecretFirst = sinon.stub().returns('secret-key');
        const sessionServiceFirst = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache: getSecretFirst,
            urlUtils
        });

        const authCodeFirst = await sessionServiceFirst.generateAuthCodeForUser(req, res);

        // Test for second secret
        const getSecretSecond = sinon.stub().returns('different-secret-key');
        const sessionServiceSecond = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache: getSecretSecond,
            urlUtils
        });

        const authCodeSecond = await sessionServiceSecond.generateAuthCodeForUser(req, res);
        assert.notEqual(authCodeFirst, authCodeSecond);
    });

    it('sends an email with the auth code', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake',
                origin: 'https://admin.example.com'
            };
            return req.session;
        };

        const findUserById = sinon.stub().resolves({
            id: 'user-123',
            get: sinon.stub().returns('test@example.com')
        });

        const mailer = {
            send: sinon.stub().resolves()
        };

        const getBlogLogo = sinon.stub().returns('logo.png');
        const localUrlUtils = {
            getAdminUrl: sinon.stub().returns('https://admin.example.com'),
            getSiteUrl: sinon.stub().returns('https://example.com'),
            urlFor: sinon.stub().returns('https://example.com')
        };

        const t = sinon.stub().callsFake(text => text);
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            getBlogLogo,
            urlUtils: localUrlUtils,
            mailer,
            t
        });

        const req = Object.create(express.request, {
            headers: {
                value: {
                    origin: 'https://admin.example.com'
                }
            }
        });
        const res = Object.create(express.response);

        await sessionService.sendAuthCodeToUser(req, res);

        sinon.assert.calledOnce(mailer.send);
        const emailArgs = mailer.send.firstCall.args[0];
        assert.equal(emailArgs.to, 'test@example.com');
        assert.match(emailArgs.subject, /Ghost sign in verification code/);
    });

    it('throws an error when mail fails to send', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake',
                origin: 'https://admin.example.com'
            };
            return req.session;
        };

        const findUserById = sinon.stub().resolves({
            id: 'user-123',
            get: sinon.stub().returns('test@example.com')
        });

        const mailer = {
            send: sinon.stub().rejects(new Error('Mail error'))
        };

        const getBlogLogo = sinon.stub().returns('logo.png');
        const localUrlUtils = {
            getAdminUrl: sinon.stub().returns('https://admin.example.com'),
            getSiteUrl: sinon.stub().returns('https://example.com'),
            urlFor: sinon.stub().returns('https://example.com')
        };

        const t = sinon.stub().callsFake(text => text);
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            getBlogLogo,
            urlUtils: localUrlUtils,
            mailer,
            t
        });

        const req = Object.create(express.request, {
            headers: {
                value: {
                    origin: 'https://admin.example.com'
                }
            }
        });
        const res = Object.create(express.response);

        await assert.rejects(sessionService.sendAuthCodeToUser(req, res), {
            message: 'Failed to send email. Please check your site configuration and try again.'
        });
    });

    it('Can create a verified session for SSO', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        await sessionService.createVerifiedSessionForUser(req, res, user);

        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, true);
    });

    it('Throws if the user id is invalid', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake',
                origin: 'https://admin.example.com'
            };
            return req.session;
        };

        const findUserById = sinon.stub().rejects(new Error('User not found'));

        const mailer = {
            send: sinon.stub().resolves()
        };

        const getBlogLogo = sinon.stub().returns('logo.png');
        const localUrlUtils = {
            getAdminUrl: sinon.stub().returns('https://admin.example.com'),
            getSiteUrl: sinon.stub().returns('https://example.com'),
            urlFor: sinon.stub().returns('https://example.com')
        };

        const t = sinon.stub().callsFake(text => text);
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            getBlogLogo,
            urlUtils: localUrlUtils,
            mailer,
            t
        });

        const req = Object.create(express.request, {
            headers: {
                value: {
                    origin: 'https://admin.example.com'
                }
            }
        });
        const res = Object.create(express.response);

        await assert.rejects(sessionService.sendAuthCodeToUser(req, res), {
            message: 'Could not fetch user from the session.'
        });
    });

    it('Can remove verified session', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                destroy: sinon.spy(cb => cb())
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://admin.example.com');

        const isStaffDeviceVerificationDisabled = sinon.stub().returns(false);
        getSettingsCache.withArgs('require_email_mfa').returns(true);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            isStaffDeviceVerificationDisabled,
            urlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://admin.example.com'
            }
        });
        const res = Object.create(express.response);
        const user = {id: 'egg'};

        await sessionService.createSessionForUser(req, res, user);
        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, undefined);

        await sessionService.verifySession(req, res);
        assert.equal(req.session.verified, true);

        await sessionService.removeUserForSession(req, res);
        assert.equal(req.session.user_id, undefined);
        assert.equal(req.session.verified, undefined);

        await sessionService.createSessionForUser(req, res, user);
        assert.equal(req.session.user_id, 'egg');
        assert.equal(req.session.verified, undefined);
    });

    it('Rejects sendAuthCodeToUser when origin does not match admin URL', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake',
                origin: 'https://evil.com'
            };
            return req.session;
        };

        const findUserById = sinon.stub().resolves({
            id: 'user-123',
            get: sinon.stub().returns('test@example.com')
        });

        const mailer = {
            send: sinon.stub().resolves()
        };

        const getBlogLogo = sinon.stub().returns('logo.png');
        const getOriginOfRequest = sinon.stub().returns('https://evil.com');

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            getBlogLogo,
            urlUtils,
            mailer,
            t: sinon.stub().callsFake(text => text)
        });

        const req = Object.create(express.request, {
            headers: {
                value: {
                    origin: 'https://evil.com'
                }
            }
        });
        const res = Object.create(express.response);

        await assert.rejects(
            sessionService.sendAuthCodeToUser(req, res),
            {message: `Request made from incorrect origin. Expected 'https://admin.example.com' received 'https://evil.com'.`}
        );

        assert.equal(mailer.send.callCount, 0, 'No email should be sent');
    });

    it('Falls back to site URL when no admin URL is configured', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                origin: 'https://example.com'
            };
            return req.session;
        };

        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('https://example.com');
        const siteOnlyUrlUtils = {
            getAdminUrl: sinon.stub().returns(null),
            getSiteUrl: sinon.stub().returns('https://example.com'),
            urlFor: sinon.stub().returns('https://example.com')
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            urlUtils: siteOnlyUrlUtils
        });

        const req = Object.create(express.request, {
            ip: {
                value: '0.0.0.0'
            },
            headers: {
                value: {
                    cookie: 'thing'
                }
            },
            get: {
                value: () => 'https://example.com'
            }
        });
        const res = Object.create(express.response);

        const user = await sessionService.getUserForSession(req, res);
        assert.deepEqual(user, {id: 'user-123'});
    });

    describe('isVerificationRequired', function () {
        it('returns true when require_email_mfa is true', async function () {
            getSettingsCache.withArgs('require_email_mfa').returns(true);

            const sessionService = SessionService({
                getSettingsCache
            });

            const result = sessionService.isVerificationRequired();
            assert.equal(result, true);
        });

        it('returns false when require_email_mfa is false', async function () {
            getSettingsCache.withArgs('require_email_mfa').returns(false);

            const sessionService = SessionService({
                getSettingsCache
            });

            const result = sessionService.isVerificationRequired();
            assert.equal(result, false);
        });

        it('returns false when require_email_mfa is not set', async function () {
            getSettingsCache.withArgs('require_email_mfa').returns(undefined);

            const sessionService = SessionService({
                getSettingsCache
            });

            const result = sessionService.isVerificationRequired();
            assert.equal(result, false);
        });
    });
});
