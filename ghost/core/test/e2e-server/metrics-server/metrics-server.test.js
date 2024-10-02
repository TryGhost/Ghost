const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const request = require('supertest');

describe('Metrics Server', function () {
    it('should start up when Ghost boots', async function () {
        await testUtils.startGhost({forceStart: true});
        request('http://127.0.0.1:9416').get('/metrics').expect(200);
        await testUtils.stopGhost();
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

        await testUtils.stopGhost();
    });
});