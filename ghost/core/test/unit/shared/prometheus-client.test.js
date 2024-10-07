const assert = require('node:assert/strict');
const prometheusClient = require('../../../core/shared/prometheus-client');
const sinon = require('sinon');

describe('PrometheusClient', function () {
    describe('getMetrics', function () {
        it('should return metrics', async function () {
            const metrics = await prometheusClient.getMetrics();
            assert.match(metrics, /^# HELP/);
        });
    });

    describe('getContentType', function () {
        it('should return the content type', function () {
            assert.equal(prometheusClient.getContentType(), 'text/plain; version=0.0.4; charset=utf-8');
        });
    });

    describe('getRegistry', function () {
        it('should return the registry', function () {
            assert.ok(prometheusClient.getRegistry());
        });
    });

    describe('handleMetricsRequest', function () {
        it('should return metrics', async function () {
            const req = {};
            const res = {
                set: sinon.stub(),
                end: sinon.stub()
            };
            await prometheusClient.handleMetricsRequest(req, res);
            assert.ok(res.set.calledWith('Content-Type', prometheusClient.getContentType()));
            assert.ok(res.end.calledOnce);
        });

        it('should return an error if getting metrics fails', async function () {
            sinon.stub(prometheusClient, 'getMetrics').throws(new Error('Failed to get metrics'));
            const req = {};
            const res = {
                set: sinon.stub(),
                end: sinon.stub(),
                status: sinon.stub().returnsThis()
            };
            await prometheusClient.handleMetricsRequest(req, res);
            assert.ok(res.status.calledWith(500));
        });
    });
});
