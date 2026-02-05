const express = require('express');
const sinon = require('sinon');
const should = require('should');
const SessionFromToken = require('../../../../../core/server/services/auth/session/session-from-token');

describe('SessionFromToken', function () {
    it('Parses the request, matches the user to the token, sets the user on req.user and calls createSession', async function () {
        const createSession = sinon.spy(async (req, res, user) => {
            req.session = user;
        });
        const findUserByLookup = sinon.spy(async email => ({id: '1', email}));
        const getTokenFromRequest = sinon.spy(async req => req.token);
        const getLookupFromToken = sinon.spy(async token => token.email);

        const handler = SessionFromToken({
            getTokenFromRequest,
            getLookupFromToken,
            findUserByLookup,
            createSession,
            callNextWithError: true
        });

        const req = Object.create(express.request);
        const res = Object.create(express.response);
        const next = sinon.spy();

        req.token = {
            email: 'user@host.tld'
        };

        await handler(req, res, next);

        should.ok(getTokenFromRequest.calledOnceWith(req));
        const token = await getTokenFromRequest.returnValues[0];

        should.ok(getLookupFromToken.calledOnceWith(token));
        const email = await getLookupFromToken.returnValues[0];

        should.ok(findUserByLookup.calledOnceWith(email));
        const foundUser = await findUserByLookup.returnValues[0];

        should.ok(createSession.calledOnceWith(req, res, foundUser));
    });
});
