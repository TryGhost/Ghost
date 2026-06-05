const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const sinon = require('sinon');
const testUtils = require('../../utils');
const jobService = require('../../../core/server/services/jobs/job-service');
const updateCheckService = require('../../../core/server/services/update-check');
const config = require('../../../core/shared/config');

const JOB_NAME = 'update-check';
const BOOT_JOB_NAME = 'update-check-boot';
const JOB_PATH = path.resolve(__dirname, '../../../core/server/services/update-check/run-update-check.js');

describe('Run Update Check', function () {
    let mockUpdateServer;
    let mockUpdateServerRequestCount;

    before(testUtils.setup('default'));

    beforeEach(function () {
        mockUpdateServerRequestCount = 0;
        // The boot path runs in a separate worker thread so nock can't
        // intercept; a real HTTP server is the only reliable observation point.
        mockUpdateServer = http.createServer((req, res) => {
            mockUpdateServerRequestCount += 1;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({hello: 'world'}));
        });
        mockUpdateServer.listen(0);
    });

    afterEach(async function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
        }
        // bree rejects duplicate job names; remove any we registered so the
        // next test starts clean. Errors swallowed because not every test
        // registers every job.
        await jobService.removeJob(JOB_NAME).catch(() => {});
        await jobService.removeJob(BOOT_JOB_NAME).catch(() => {});
        sinon.restore();
    });

    it('successfully executes the update checker', async function () {
        const mockUpdateServerPort = mockUpdateServer.address().port;

        await jobService.addJob({
            name: JOB_NAME,
            job: JOB_PATH,
            data: {
                forceUpdate: true,
                updateCheckUrl: `http://127.0.0.1:${mockUpdateServerPort}`
            }
        });

        await jobService.awaitCompletion(JOB_NAME);

        assert.equal(mockUpdateServerRequestCount, 1, 'Expected mock server to receive 1 request');
    });

    describe('scheduleRecurringJobs', function () {
        it('runs an immediate update-check on boot when forceUpdate is true', async function () {
            const mockUpdateServerPort = mockUpdateServer.address().port;
            sinon.stub(config, 'get')
                .callThrough()
                .withArgs('updateCheck:forceUpdate').returns(true)
                .withArgs('updateCheck:url').returns(`http://127.0.0.1:${mockUpdateServerPort}`);

            updateCheckService.scheduleRecurringJobs();

            await jobService.awaitCompletion(BOOT_JOB_NAME);

            assert.equal(mockUpdateServerRequestCount, 1, 'Expected mock server to receive 1 request from the boot-time check');
        });

        it('does not run an immediate update-check on boot when forceUpdate is false', async function () {
            const mockUpdateServerPort = mockUpdateServer.address().port;
            sinon.stub(config, 'get')
                .callThrough()
                .withArgs('updateCheck:forceUpdate').returns(false)
                .withArgs('updateCheck:url').returns(`http://127.0.0.1:${mockUpdateServerPort}`);

            updateCheckService.scheduleRecurringJobs();

            // Give the event loop ample time for a misfire to land before
            // asserting the negative.
            await new Promise((resolve) => {
                setTimeout(resolve, 200);
            });

            assert.equal(mockUpdateServerRequestCount, 0, 'Expected mock server to receive 0 requests');
        });
    });
});
