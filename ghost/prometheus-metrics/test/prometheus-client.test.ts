import assert from 'assert/strict';
import {PrometheusClient} from '../src';
import {Request, Response} from 'express';
import * as sinon from 'sinon';

describe('Prometheus Client', function () {
    let instance: PrometheusClient;
    beforeEach(function () {
        sinon.restore();
    });

    afterEach(function () {
        if (instance) {
            instance.stop();
            instance.client.register.clear();
        }
    });

    describe('constructor', function () {
        it('should create a new instance', function () {
            instance = new PrometheusClient();
            assert.ok(instance);
        });
    });

    describe('init', function () {
        it('should call collectDefaultMetrics', function () {
            instance = new PrometheusClient();
            const collectDefaultMetricsSpy = sinon.spy(instance.client, 'collectDefaultMetrics');
            instance.init();
            assert.ok(collectDefaultMetricsSpy.called);
        });

        it('should create the pushgateway client if the pushgateway is enabled', function () {
            instance = new PrometheusClient({pushgateway: {enabled: true}});
            instance.init();
            assert.ok(instance.gateway);
        });

        it('should push metrics to the pushgateway if it is enabled', async function () {
            const clock = sinon.useFakeTimers();
            instance = new PrometheusClient({pushgateway: {enabled: true}});
            const pushMetricsSpy = sinon.spy(instance, 'pushMetrics');
            instance.init();
            clock.tick(10000);
            assert.ok(pushMetricsSpy.called);
        });
    });

    describe('collectDefaultMetrics', function () {
        it('should call collectDefaultMetrics on the client', function () {
            instance = new PrometheusClient();
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
            await instance.handleMetricsRequest(req, res);
            assert.ok(setStub.calledWith('Content-Type', instance.getContentType()));
            assert.ok(endStub.calledOnce);
        });

        it('should return an error if getting metrics fails', async function () {
            instance = new PrometheusClient();
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
            instance = new PrometheusClient();
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
            instance = new PrometheusClient();
            instance.init();
            const metrics = await instance.getMetrics();
            assert.match(metrics, /^# HELP/);
        });
    });
});
