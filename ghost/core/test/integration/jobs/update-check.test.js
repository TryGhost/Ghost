const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const jobService = require('../../../core/server/services/jobs/job-service');
const runUpdateCheck = require('../../../core/server/services/update-check');

const JOB_NAME = 'update-check';
const JOB_PATH = path.resolve(__dirname, '../../../core/server/services/update-check/run-update-check.js');

describe('Run Update Check', function () {
    let mockUpdateServer;

    before(testUtils.setup('default'));

    afterEach(async function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
        }
        await configUtils.restore();
    });

    it('successfully executes the update checker', async function () {
        let mockUpdateServerRequestCount = 0;

        // Initialise mock update server - We use a mock server here instead of
        // nock because the update-check job will be executed in a separate
        // process which will prevent nock from intercepting HTTP requests
        mockUpdateServer = http.createServer((req, res) => {
            mockUpdateServerRequestCount += 1;

            res.writeHead(200, {'Content-Type': 'application/json'});

            res.end(JSON.stringify({hello: 'world'}));
        });

        mockUpdateServer.listen(0); // Listen on random port

        const mockUpdateServerPort = mockUpdateServer.address().port;

        // Trigger the update-check job and wait for it to finish
        await jobService.addJob({
            name: JOB_NAME,
            job: JOB_PATH,
            data: {
                forceUpdate: true,
                updateCheckUrl: `http://127.0.0.1:${mockUpdateServerPort}`
            }
        });

        await jobService.awaitCompletion(JOB_NAME);

        // Assert that the mock update server received a request (which means the update-check job ran successfully)
        assert.equal(mockUpdateServerRequestCount, 1, 'Expected mock server to receive 1 request');
    });

    it('does not poll at all when both updateCheck.enabled and privacy.useUpdateCheck are disabled', async function () {
        let mockUpdateServerRequestCount = 0;
        mockUpdateServer = http.createServer((req, res) => {
            mockUpdateServerRequestCount += 1;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({hello: 'world'}));
        });
        mockUpdateServer.listen(0);
        const mockUpdateServerPort = mockUpdateServer.address().port;

        configUtils.set('updateCheck:enabled', false);
        configUtils.set('privacy', {useUpdateCheck: false});

        await runUpdateCheck({
            forceUpdate: true,
            updateCheckUrl: `http://127.0.0.1:${mockUpdateServerPort}`
        });

        assert.equal(mockUpdateServerRequestCount, 0, 'No purpose remains, so no poll should happen');
    });
});
