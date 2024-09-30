import assert from 'assert/strict';
import {MetricsServer} from '../src';
import request from 'supertest';
import express from 'express';
import * as sinon from 'sinon';

describe('Metrics Server', function () {
    let metricsServer: MetricsServer;

    afterEach(async function () {
        await metricsServer.stop();
    });

    describe('constructor', function () {
        it('should create a new instance', function () {
            metricsServer = new MetricsServer();
            assert.ok(metricsServer);
        });
    });

    describe('start', function () {
        it('should start the server', async function () {
            metricsServer = new MetricsServer();
            const server = await metricsServer.start();
            assert.ok(server);
        });

        it('should use the default handler if none is provided', async function () {
            metricsServer = new MetricsServer();
            const {app} = await metricsServer.start();
            const response = await request(app).get('/metrics');
            assert.ok(response.status === 501);
        });

        it('should use the provided handler', async function () {
            const handler: express.Handler = sinon.stub().callsFake((req: express.Request, res: express.Response) => {
                res.send('metrics');
            });
            const serverConfig = {
                host: '0.0.0.0',
                port: 3000
            };
            metricsServer = new MetricsServer({serverConfig, handler});
            const {app} = await metricsServer.start();
            const response = await request(app).get('/metrics');
            assert.ok(response.status === 200);
            assert.ok(response.text === 'metrics');
        });
    });

    describe('stop', function () {
        it('should stop the server', async function () {
            metricsServer = new MetricsServer();
            const server = await metricsServer.start();
            await metricsServer.stop();
            assert.ok(server);
        });
    });

    describe('shutdown', function () {
        it('should shutdown the server', async function () {
            metricsServer = new MetricsServer();
            const server = await metricsServer.start();
            await metricsServer.shutdown();
            assert.ok(server);
        });

        it('should not shutdown the server if it is already shutting down', async function () {
            metricsServer = new MetricsServer();
            const stopSpy = sinon.spy(metricsServer, 'stop');
            await metricsServer.start();
            // Call shutdown multiple times simultaneously
            Promise.all([metricsServer.shutdown(), metricsServer.shutdown()]);
            // It should only call stop() once
            sinon.assert.calledOnce(stopSpy);
        });
    });
});
