const should = require('should');
const sinon = require('sinon');
const express = require('express');
const SessionService = require('../');

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
        const findUserById = sinon.spy(async ({id}) => ({id}));
        const getOriginOfRequest = sinon.stub().returns('origin');
        const labs = {
            isSet: () => true
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
});
