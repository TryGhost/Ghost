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
    let baselineMailTransport;

    before(testUtils.setup('default'));

    beforeEach(function () {
        baselineMailTransport = process.env.mail__transport;
    });

    afterEach(async function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
        }
        // Reset notifications between tests so each starts clean
        await models.Settings.edit({key: 'notifications', value: '[]'}, {context: {internal: true}});
        // Remove the job so the next test can re-register it
        await jobService.removeJob(JOB_NAME).catch(() => {});
        if (baselineMailTransport === undefined) {
            delete process.env.mail__transport;
        } else {
            process.env.mail__transport = baselineMailTransport;
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

    it('stores an alert-type custom notification end-to-end', async function () {
        // Default fixtures leave the Owner inactive, so the alert branch's
        // users.browse returns no recipients and the email send returns
        // early without exercising the mailer pipeline. Activate the Owner
        // so the worker actually drives the full notificationEmailService
        // path that production hits.
        const owner = await models.User.findOne(
            {email: 'ghost@example.com'},
            {context: {internal: true}, withRelated: ['roles']}
        );
        await owner.save({status: 'active'}, {patch: true, context: {internal: true}});

        // Worker threads inherit process.env, so this routes the worker's
        // GhostMailer to nodemailer-stub-transport. Without it the worker
        // hits the default SMTP transport and ECONNREFUSEs on localhost:587.
        process.env.mail__transport = 'stub';

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

    describe('channel filtering', function () {
        const RELEASE_NOTIFICATION_ID = 'channel-filter-release-msg';

        function mockReleaseResponse() {
            return http.createServer((req, res) => {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    id: 99999,
                    version: '6.45.0',
                    messages: [{
                        id: RELEASE_NOTIFICATION_ID,
                        version: '^6',
                        content: '<p>Ghost v6.45.0 has been released</p>',
                        top: false,
                        dismissible: true,
                        type: 'info'
                    }],
                    created_at: '2026-06-08T00:00:00.000Z',
                    custom: false,
                    next_check: Math.floor(Date.now() / 1000) + 86400
                }));
            });
        }

        async function runWorker(enabledChannels) {
            mockUpdateServer = mockReleaseResponse();
            mockUpdateServer.listen(0);
            const port = mockUpdateServer.address().port;

            const data = {
                forceUpdate: true,
                updateCheckUrl: `http://127.0.0.1:${port}`
            };
            if (enabledChannels !== undefined) {
                data.enabledChannels = enabledChannels;
            }

            await jobService.addJob({name: JOB_NAME, job: JOB_PATH, data});
            await jobService.awaitCompletion(JOB_NAME);

            const setting = await models.Settings.findOne(
                {key: 'notifications'},
                {context: {internal: true}}
            );
            const stored = JSON.parse(setting.get('value'));
            return stored.find(n => n.id === RELEASE_NOTIFICATION_ID);
        }

        it('persists every channel when enabledChannels is undefined', async function () {
            const persisted = await runWorker(undefined);
            assert.ok(persisted, 'Expected the release notification to be persisted when no channel filter is configured');
        });

        it('persists no channels when enabledChannels is the empty array', async function () {
            const persisted = await runWorker([]);
            assert.equal(persisted, undefined, 'Expected the release notification to be dropped when the channel allowlist is empty');
        });

        it('drops a notification whose channel is excluded from the allowlist', async function () {
            const persisted = await runWorker(['security']);
            assert.equal(persisted, undefined, 'Expected the release notification to be dropped when only the security channel is enabled');
        });

        it('persists a notification whose channel is in the allowlist', async function () {
            const persisted = await runWorker(['release']);
            assert.ok(persisted, 'Expected the release notification to be persisted when the release channel is enabled');
        });

        it('classifies a custom alert notification as the security channel', async function () {
            const SECURITY_NOTIFICATION_ID = 'channel-filter-security-msg';

            mockUpdateServer = http.createServer((req, res) => {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    id: 99998,
                    version: 'all-security',
                    messages: [{
                        id: SECURITY_NOTIFICATION_ID,
                        version: '^6',
                        content: '<p>Critical security advisory</p>',
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

            // The alert branch reaches notificationEmailService.send, which
            // would ECONNREFUSE on localhost SMTP without a stub transport.
            const owner = await models.User.findOne(
                {email: 'ghost@example.com'},
                {context: {internal: true}, withRelated: ['roles']}
            );
            await owner.save({status: 'active'}, {patch: true, context: {internal: true}});
            process.env.mail__transport = 'stub';

            await jobService.addJob({
                name: JOB_NAME,
                job: JOB_PATH,
                data: {
                    forceUpdate: true,
                    updateCheckUrl: `http://127.0.0.1:${port}`,
                    enabledChannels: ['security']
                }
            });
            await jobService.awaitCompletion(JOB_NAME);

            const setting = await models.Settings.findOne(
                {key: 'notifications'},
                {context: {internal: true}}
            );
            const stored = JSON.parse(setting.get('value'));
            const persisted = stored.find(n => n.id === SECURITY_NOTIFICATION_ID);

            assert.ok(persisted, 'Expected the security alert to be persisted when the security channel is enabled');
        });
    });
});
