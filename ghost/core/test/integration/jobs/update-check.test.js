const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const testUtils = require('../../utils');
const jobService = require('../../../core/server/services/jobs/job-service');
const models = require('../../../core/server/models');

const JOB_NAME = 'update-check';
const JOB_PATH = path.resolve(__dirname, '../../../core/server/services/update-check/run-update-check.js');

describe('Run Update Check', function () {
    let mockUpdateServer;

    before(testUtils.setup('default'));

    afterEach(async function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
        }
        // Reset notifications between tests so each starts clean
        await models.Settings.edit({key: 'notifications', value: '[]'}, {context: {internal: true}});
        // Remove the job so the next test can re-register it
        await jobService.removeJob(JOB_NAME).catch(() => {});
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

    it('stores an alert-type custom notification end-to-end', async function () {
        mockUpdateServer = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                id: 99999,
                version: 'all-test',
                messages: [{
                    id: 'integration-test-alert-msg',
                    version: '^6',
                    content: '<p>Integration test alert</p>',
                    top: true,
                    dismissible: false,
                    type: 'alert'
                }],
                created_at: '2026-06-08T00:00:00.000Z',
                custom: true,
                next_check: Math.floor(Date.now() / 1000) + 86400
            }));
        });

        mockUpdateServer.listen(0);
        const port = mockUpdateServer.address().port;

        await jobService.addJob({
            name: JOB_NAME,
            job: JOB_PATH,
            data: {
                forceUpdate: true,
                updateCheckUrl: `http://127.0.0.1:${port}`
            }
        });

        await jobService.awaitCompletion(JOB_NAME);

        const setting = await models.Settings.findOne({key: 'notifications'}, {context: {internal: true}});
        const stored = JSON.parse(setting.get('value'));
        const ourNotification = stored.find(n => n.id === 'integration-test-alert-msg');

        assert.ok(ourNotification, 'Expected the alert notification to be stored in settings');
        assert.equal(ourNotification.type, 'alert');
        assert.equal(ourNotification.message, '<p>Integration test alert</p>');
        assert.equal(ourNotification.custom, true);
    });
});
