const assert = require('node:assert/strict');
const http = require('http');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const updateCheck = require('../../../core/server/services/update-check');
const models = require('../../../core/server/models');

describe('Run Update Check', function () {
    let mockUpdateServer;

    beforeAll(testUtils.setup('default', 'perms:init'));

    beforeAll(async function () {
        // The old worker re-initialised these for its own process; in-process
        // the update check relies on boot having done it, so the minimal test
        // harness does it here.
        await require('../../../core/server/services/email-address').init();
        // The update check builds its GhostMailer per run, so this routes the
        // alert email to the stub transport instead of a real SMTP connection.
        configUtils.set('mail', {transport: 'stub'});
    });

    afterAll(async function () {
        await configUtils.restore();
    });

    afterEach(async function () {
        if (mockUpdateServer) {
            mockUpdateServer.close();
        }
        // Reset notifications between tests so each starts clean
        await models.Settings.edit({key: 'notifications', value: '[]'}, {context: {internal: true}});
    });

    it('successfully executes the update checker', async function () {
        let mockUpdateServerRequestCount = 0;

        // Initialise a real mock update server so the full HTTP request path
        // is exercised, as it was when this ran in a worker process
        mockUpdateServer = http.createServer((req, res) => {
            mockUpdateServerRequestCount += 1;

            res.writeHead(200, {'Content-Type': 'application/json'});

            res.end(JSON.stringify({hello: 'world'}));
        });

        mockUpdateServer.listen(0); // Listen on random port

        const mockUpdateServerPort = mockUpdateServer.address().port;

        // Run the update check in-process, as the JobQueue handler does
        await updateCheck({
            rethrowErrors: true,
            forceUpdate: true,
            updateCheckUrl: `http://127.0.0.1:${mockUpdateServerPort}`
        });

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

        // Run the update check in-process, as the JobQueue handler does
        await updateCheck({
            rethrowErrors: true,
            forceUpdate: true,
            updateCheckUrl: `http://127.0.0.1:${port}`
        });

        const setting = await models.Settings.findOne({key: 'notifications'}, {context: {internal: true}});
        const stored = JSON.parse(setting.get('value'));
        const ourNotification = stored.find(n => n.id === 'integration-test-alert-msg');

        assert.ok(ourNotification, 'Expected the alert notification to be stored in settings');
        assert.equal(ourNotification.type, 'alert');
        assert.equal(ourNotification.message, '<p>Integration test alert</p>');
        assert.equal(ourNotification.custom, true);
    });
});
