import assert from 'assert/strict';
import {PrometheusClient} from '../src';
import {Request, Response} from 'express';
import * as sinon from 'sinon';
import client from 'prom-client';

const createPrometheusClientInstance = () => {
    // Create a new registry for each test to avoid conflicts
    const register = new client.Registry();
    return {client: new PrometheusClient({register}), register: register};
};

describe('Prometheus Client', function () {
    beforeEach(function () {
        sinon.restore();
    });
    describe('with default registry', function () {
        let defaultClient: PrometheusClient;

        before(function () {
            defaultClient = new PrometheusClient();
        });

        it('should create a new instance with the default registry', function () {
            assert.ok(defaultClient);
        });

        it('should return the default register', function () {
            const register = defaultClient.getRegister();
            assert.ok(register);
        });

        it('init: should call collectDefaultMetrics', function () {
            const collectDefaultMetricsSpy = sinon.spy(defaultClient.client, 'collectDefaultMetrics');
            defaultClient.init();
            assert.ok(collectDefaultMetricsSpy.called);
        });
    });

    describe('constructor', function () {
        it('should create a new instance with a new registry', function () {
            const {client: instance} = createPrometheusClientInstance();
            assert.ok(instance);
        });
    });

    describe('init', function () {
        it('should call collectDefaultMetrics', function () {
            const {client: instance} = createPrometheusClientInstance();
            const collectDefaultMetricsSpy = sinon.spy(instance.client, 'collectDefaultMetrics');
            instance.init();
            assert.ok(collectDefaultMetricsSpy.called);
        });
    });

    describe('collectDefaultMetrics', function () {
        it('should call collectDefaultMetrics on the client', function () {
            const {client: instance} = createPrometheusClientInstance();
            const collectDefaultMetricsSpy = sinon.spy(instance.client, 'collectDefaultMetrics');
            instance.collectDefaultMetrics();
            assert.ok(collectDefaultMetricsSpy.called);
        });
    });

    describe('handleMetricsRequest', function () {
        it('should return the metrics', async function () {
            const setStub = sinon.stub();
            const endStub = sinon.stub();
            const req = {} as Request;
            const res = {
                set: setStub,
                end: endStub
            } as unknown as Response;
            const {client: instance} = createPrometheusClientInstance();
            await instance.handleMetricsRequest(req, res);
            assert.ok(setStub.calledWith('Content-Type', instance.getContentType()));
            assert.ok(endStub.calledOnce);
        });

        it('should return an error if getting metrics fails', async function () {
            const {client: instance} = createPrometheusClientInstance();
            sinon.stub(instance, 'getMetrics').throws(new Error('Failed to get metrics'));
            const statusStub = sinon.stub().returnsThis();
            const endStub = sinon.stub();
            const req = {} as Request;
            const res = {
                set: sinon.stub(),
                end: endStub,
                status: statusStub
            } as unknown as Response;
            await instance.handleMetricsRequest(req, res);
            assert.ok(statusStub.calledWith(500));
            assert.ok(endStub.calledOnce);
        });

        it('should return a generic error if the error is unknown', async function () {
            const {client: instance} = createPrometheusClientInstance();
            sinon.stub(instance, 'getMetrics').throws({name: 'UnknownError'});
            const statusStub = sinon.stub().returnsThis();
            const endStub = sinon.stub();
            const req = {} as Request;
            const res = {
                set: sinon.stub(),
                end: endStub,
                status: statusStub
            } as unknown as Response;
            await instance.handleMetricsRequest(req, res);
            assert.ok(statusStub.calledWith(500));
            assert.ok(endStub.calledOnce);
        });
    });

    describe('getMetrics', function () {
        it('should return metrics', async function () {
            const {client: instance} = createPrometheusClientInstance();
            instance.init();
            const metrics = await instance.getMetrics();
            assert.match(metrics, /^# HELP/);
        });
    });
});
