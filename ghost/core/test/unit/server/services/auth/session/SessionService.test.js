const should = require('should');
const sinon = require('sinon');
const express = require('express');
const SessionService = require('../../../../../../core/server/services/auth/session/session-service');

describe('SessionService', function () {
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
        const getSettingsCache = sinon.spy(async (key) => {
            if (key === 'require_email_mfa') {
                return false;
            }
        });
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('origin');
        const labs = {
            isSet: () => false
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            labs
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
        const user = {id: 'egg'};

        await sessionService.createSessionForUser(req, res, user);

        should.equal(req.session.user_id, 'egg');

        const actualUser = await sessionService.getUserForSession(req, res);
        should.ok(findUserById.calledWith(sinon.match({id: 'egg'})));

        const expectedUser = await findUserById.returnValues[0];
        should.equal(actualUser, expectedUser);

        await sessionService.removeUserForSession(req, res);
        should.equal(req.session.user_id, undefined);

        const removedUser = await sessionService.getUserForSession(req, res);
        should.equal(removedUser, null);
    });

    it('Throws an error when the csrf verification fails', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                origin: 'origin'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('other-origin');
        const labs = {
            isSet: () => false
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            labs
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

        const error = `Request made from incorrect origin. Expected 'origin' received 'other-origin'.`;

        await sessionService.getUserForSession(req, res).should.be.rejectedWith(error);
    });

    it('Doesn\'t throw an error when the csrf verification fails when bypassed', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                origin: 'origin'
            };
            return req.session;
        };
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('other-origin');
        const labs = {
            isSet: () => false
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            labs
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
        res.locals = {
            bypassCsrfProtection: true
        };

        await sessionService.getUserForSession(req, res).should.be.fulfilled();
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
        const getSettingsCache = sinon.spy((key) => {
            if (key === 'require_email_mfa') {
                return false;
            }
        });
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('origin');
        const labs = {
            isSet: () => true
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            labs
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
        const user = {id: 'egg'};

        await sessionService.createSessionForUser(req, res, user);
        should.equal(req.session.user_id, 'egg');
        should.equal(req.session.verified, undefined);

        await sessionService.verifySession(req, res);
        should.equal(req.session.verified, true);

        await sessionService.removeUserForSession(req, res);
        should.equal(req.session.user_id, undefined);
        should.equal(req.session.verified, true);

        await sessionService.createSessionForUser(req, res, user);
        should.equal(req.session.user_id, 'egg');
        should.equal(req.session.verified, true);
    });

    it('Generates a valid auth code and verifies it correctly', async function () {
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
        const getOriginOfRequest = sinon.stub().returns('origin');
        const getSettingsCache = sinon.stub().returns('secret-key');
        const labs = {
            isSet: () => true
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            labs
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
        should.exist(authCode);

        req.body = {
            token: authCode
        };

        // Verify the auth code
        const isValid = await sessionService.verifyAuthCodeForUser(req, res);
        should.equal(isValid, true);
    });

    it('Fails to verify an incorrect auth code', async function () {
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
        const getOriginOfRequest = sinon.stub().returns('origin');
        const getSettingsCache = sinon.stub().returns('secret-key');
        const labs = {
            isSet: true
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            labs
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
        should.exist(authCode);

        req.body = {
            token: 'wrong-code'
        };

        // Verify an incorrect auth code
        const isValid = await sessionService.verifyAuthCodeForUser(req, res);
        should.equal(isValid, false);
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
        const getOriginOfRequest = sinon.stub().returns('origin');
        const labs = {
            isSet: () => true
        };

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

        // Test for first secret
        const getSecretFirst = sinon.stub().returns('secret-key');
        const sessionServiceFirst = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache: getSecretFirst,
            labs
        });

        const authCodeFirst = await sessionServiceFirst.generateAuthCodeForUser(req, res);

        // Test for second secret
        const getSecretSecond = sinon.stub().returns('different-secret-key');
        const sessionServiceSecond = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache: getSecretSecond
        });

        const authCodeSecond = await sessionServiceSecond.generateAuthCodeForUser(req, res);
        should.notEqual(authCodeFirst, authCodeSecond);
    });

    it('sends an email with the auth code', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake'
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

        const getSettingsCache = sinon.stub().returns('site-title');
        const getBlogLogo = sinon.stub().returns('logo.png');
        const urlUtils = {
            urlFor: sinon.stub().returns('https://example.com')
        };

        const t = sinon.stub().callsFake(text => text);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getSettingsCache,
            getBlogLogo,
            urlUtils,
            mailer,
            t,
            labs: {
                isSet: () => false
            }
        });

        const req = Object.create(express.request);
        const res = Object.create(express.response);

        await sessionService.sendAuthCodeToUser(req, res);

        should.ok(mailer.send.calledOnce);
        const emailArgs = mailer.send.firstCall.args[0];
        should.equal(emailArgs.to, 'test@example.com');
        emailArgs.subject.should.match(/Ghost sign in verification code/);
    });

    it('throws an error when mail fails to send', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake'
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

        const getSettingsCache = sinon.stub().returns('site-title');
        const getBlogLogo = sinon.stub().returns('logo.png');
        const urlUtils = {
            urlFor: sinon.stub().returns('https://example.com')
        };

        const t = sinon.stub().callsFake(text => text);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getSettingsCache,
            getBlogLogo,
            urlUtils,
            mailer,
            t,
            labs: {
                isSet: () => false
            }
        });

        const req = Object.create(express.request);
        const res = Object.create(express.response);

        await should(sessionService.sendAuthCodeToUser(req, res))
            .rejectedWith({
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
        const getOriginOfRequest = sinon.stub().returns('origin');
        const labs = {
            isSet: () => false
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            labs
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
        const user = {id: 'egg'};

        await sessionService.createVerifiedSessionForUser(req, res, user);

        should.equal(req.session.user_id, 'egg');
        should.equal(req.session.verified, true);
    });

    it('Throws if the user id is invalid', async function () {
        const getSession = async (req) => {
            if (req.session) {
                return req.session;
            }
            req.session = {
                user_id: 'user-123',
                ip: '0.0.0.0',
                user_agent: 'Fake'
            };
            return req.session;
        };

        const findUserById = sinon.stub().rejects(new Error('User not found'));

        const mailer = {
            send: sinon.stub().resolves()
        };

        const getSettingsCache = sinon.stub().returns('site-title');
        const getBlogLogo = sinon.stub().returns('logo.png');
        const urlUtils = {
            urlFor: sinon.stub().returns('https://example.com')
        };

        const t = sinon.stub().callsFake(text => text);

        const sessionService = SessionService({
            getSession,
            findUserById,
            getSettingsCache,
            getBlogLogo,
            urlUtils,
            mailer,
            t,
            labs: {
                isSet: () => false
            }
        });

        const req = Object.create(express.request);
        const res = Object.create(express.response);

        await should(sessionService.sendAuthCodeToUser(req, res, {id: 'invalid'}))
            .rejectedWith({
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
        const getSettingsCache = sinon.spy((key) => {
            if (key === 'require_email_mfa') {
                return true;
            } else {
                return 'site-title';
            }
        });
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('origin');
        const labs = {
            isSet: () => true
        };

        const sessionService = SessionService({
            getSession,
            findUserById,
            getOriginOfRequest,
            getSettingsCache,
            labs
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
        const user = {id: 'egg'};

        await sessionService.createSessionForUser(req, res, user);
        should.equal(req.session.user_id, 'egg');
        should.equal(req.session.verified, undefined);

        await sessionService.verifySession(req, res);
        should.equal(req.session.verified, true);

        await sessionService.removeUserForSession(req, res);
        should.equal(req.session.user_id, undefined);
        should.equal(req.session.verified, undefined);

        await sessionService.createSessionForUser(req, res, user);
        should.equal(req.session.user_id, 'egg');
        should.equal(req.session.verified, undefined);
    });
});
