const express = require('express');
const sinon = require('sinon');
const request = require('supertest');
const logging = require('@tryghost/logging');

const logRequest = require('../../../../../../core/server/web/parent/middleware/log-request');

describe('Log request middleware', function () {
    let infoStub;
    let errorStub;

    beforeEach(function () {
        infoStub = sinon.stub(logging, 'info');
        errorStub = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    function createApp() {
        const app = express();
        app.use(logRequest);
        app.get('/', (req, res) => {
            res.json({ok: true});
        });
        return app;
    }

    it('logs normal requests', async function () {
        await request(createApp())
            .get('/')
            .expect(200);

        sinon.assert.calledOnce(infoStub);
        sinon.assert.notCalled(errorStub);
    });

    it('skips logging for the Docker healthcheck user-agent', async function () {
        await request(createApp())
            .get('/')
            .set('User-Agent', 'GhostDockerHealthcheck/1.0')
            .expect(200);

        sinon.assert.notCalled(infoStub);
        sinon.assert.notCalled(errorStub);
    });

    it('still logs requests with a similar but not exact user-agent', async function () {
        await request(createApp())
            .get('/')
            .set('User-Agent', 'GhostDockerHealthcheck/2.0')
            .expect(200);

        sinon.assert.calledOnce(infoStub);
    });

    it('still logs requests with the generic node UA', async function () {
        await request(createApp())
            .get('/')
            .set('User-Agent', 'node')
            .expect(200);

        sinon.assert.calledOnce(infoStub);
    });
});
