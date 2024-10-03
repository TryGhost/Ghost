import assert from 'assert/strict';
import {MetricsServer} from '../src';
import request from 'supertest';
import express from 'express';
import * as sinon from 'sinon';

describe('Metrics Server', function () {
    let metricsServer: MetricsServer;
    let serverConfig = {
        host: '127.0.0.1',
        port: 9416
    };
    let handler = (req: express.Request, res: express.Response) => {
        res.send('metrics');
    };

    afterEach(async function () {
        await metricsServer.stop();
    });

    after(async function () {
        await metricsServer.shutdown();
    });

    describe('constructor', function () {
        it('should create a new instance', function () {
            metricsServer = new MetricsServer({serverConfig, handler});
            assert.ok(metricsServer);
        });
    });

    describe('start', function () {
        before(function () {
            metricsServer = new MetricsServer({serverConfig, handler});
        });
        it('should start the server', async function () {
            const server = await metricsServer.start();
            assert.ok(server);
        });

        it('should use the provided handler', async function () {
            const {app} = await metricsServer.start();
            const response = await request(app).get('/metrics');
            assert.ok(response.status === 200);
            assert.ok(response.text === 'metrics');
        });
    });

    describe('stop', function () {
        before(function () {
            metricsServer = new MetricsServer({serverConfig, handler});
        });
        it('should stop the server', async function () {
            const server = await metricsServer.start();
            await metricsServer.stop();
            assert.ok(server);
        });
    });

    describe('shutdown', function () {
        before(function () {
            metricsServer = new MetricsServer({serverConfig, handler});
        });
        it('should shutdown the server', async function () {
            const server = await metricsServer.start();
            await metricsServer.shutdown();
            assert.ok(server);
        });

        it('should not shutdown the server if it is already shutting down', async function () {
            const stopSpy = sinon.spy(metricsServer, 'stop');
            await metricsServer.start();
            // Call shutdown multiple times simultaneously
            Promise.all([metricsServer.shutdown(), metricsServer.shutdown()]);
            // It should only call stop() once
            sinon.assert.calledOnce(stopSpy);
        });
    });
});
