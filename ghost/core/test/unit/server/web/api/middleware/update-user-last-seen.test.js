const express = require('express');
const sinon = require('sinon');
const request = require('supertest');
const moment = require('moment');
const updateUserLastSeenMiddleware = require('../../../../../../core/server/web/api/middleware/update-user-last-seen');

describe('updateUserLastSeenMiddleware', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createApp(user) {
        const app = express();

        app.use((req, res, next) => {
            req.user = user;
            next();
        });
        app.use(updateUserLastSeenMiddleware);
        app.get('/', (_req, res) => {
            res.sendStatus(204);
        });
        app.use((err, _req, res, _next) => {
            void _next;
            res.status(500).json({message: err.message});
        });

        return app;
    }

    it('calls next with no error if there is no user on the request', async function () {
        await request(createApp())
            .get('/')
            .expect(204);
    });

    it('calls next with no error if the current last_seen is less than an hour before now', async function () {
        const fakeLastSeen = new Date();
        const fakeUser = {
            get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen)
        };

        await request(createApp(fakeUser))
            .get('/')
            .expect(204);
    });

    describe('when the last_seen is longer than an hour ago', function () {
        it('calls updateLastSeen on the req.user, calling next with nothing if success', async function () {
            const fakeLastSeen = moment().subtract(1, 'hours').toDate();
            const fakeUser = {
                get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen),
                updateLastSeen: sinon.stub().resolves()
            };

            await request(createApp(fakeUser))
                .get('/')
                .expect(204);
            sinon.assert.calledOnce(fakeUser.updateLastSeen);
        });

        it('calls updateLastSeen on the req.user, calling next with err if error', async function () {
            const fakeLastSeen = moment().subtract(1, 'hours').toDate();
            const fakeError = new Error('gonna need a bigger boat');
            const fakeUser = {
                get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen),
                updateLastSeen: sinon.stub().rejects(fakeError)
            };

            await request(createApp(fakeUser))
                .get('/')
                .expect(500)
                .expect({message: fakeError.message});
            sinon.assert.calledOnce(fakeUser.updateLastSeen);
        });
    });
});
