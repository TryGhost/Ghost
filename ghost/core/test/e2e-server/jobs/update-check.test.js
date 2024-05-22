const assert = require('assert/strict');
const http = require('http');
const path = require('path');

const models = require('../../../core/server/models');

models.init();

const jobService = require('../../../core/server/services/jobs/job-service');

const JOB_NAME = 'update-check';
const JOB_PATH = path.resolve(__dirname, '../../../core/server/run-update-check.js');

describe('Run Update Check', function () {
    let mockUpdateServer;

    afterEach(function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
        }
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
});
