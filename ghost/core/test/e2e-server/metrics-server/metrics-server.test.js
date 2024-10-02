const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const request = require('supertest');
const parsePrometheusTextFormat = require('parse-prometheus-text-format');

describe('Metrics Server', function () {
    after(async function () {
        await testUtils.stopGhost();
    });
    it('should start up when Ghost boots', async function () {
        await testUtils.startGhost({forceStart: true});
        request('http://127.0.0.1:9416').get('/metrics').expect(200);
    });

    it('should stop when Ghost stops', async function () {
        await testUtils.startGhost({forceStart: true});
        await testUtils.stopGhost();
            
        // Requesting the metrics endpoint should throw an error
        let error;
        try {
            await request('http://127.0.0.1:9416').get('/metrics');
        } catch (err) {
            error = err;
        }
        assert.ok(error);
        // This would throw an error if the metrics server were still running on port 9416
        await testUtils.startGhost({forceStart: true});
    });

    it('should export the metrics in the right format', async function () {
        await testUtils.startGhost({forceStart: true});
        const response = await request('http://127.0.0.1:9416').get('/metrics');
        const metricsText = response.text;
        const metrics = parsePrometheusTextFormat(metricsText);
        assert.ok(metrics);
    });
});