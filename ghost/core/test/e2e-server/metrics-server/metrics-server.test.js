const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const request = require('supertest');
const parsePrometheusTextFormat = require('parse-prometheus-text-format');

describe('Metrics Server', function () {
    afterEach(async function () {
        await testUtils.stopGhost();
    });
    it('should start up when Ghost boots and stop when Ghost stops', async function () {
        // Ensure the metrics server is running after Ghost boots
        await testUtils.startGhost({forceStart: true});
        await request('http://127.0.0.1:9416').get('/metrics').expect(200);

        // Stop Ghost and ensure the metrics server is no longer running
        await testUtils.stopGhost();
            
        // Requesting the metrics endpoint should throw an error
        let error;
        try {
            await request('http://127.0.0.1:9416').get('/metrics');
        } catch (err) {
            error = err;
        }
        assert.ok(error);
    });

    it('should export the metrics in the right format', async function () {
        await testUtils.startGhost({forceStart: true});
        const response = await request('http://127.0.0.1:9416').get('/metrics');
        const metricsText = response.text;
        const metrics = parsePrometheusTextFormat(metricsText);
        assert.ok(metrics);
    });
});