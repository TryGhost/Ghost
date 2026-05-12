const assert = require('node:assert/strict');
const http = require('node:http');
const sinon = require('sinon');
const testUtils = require('../../utils');
const mailService = require('../../../core/server/services/mail');
const request = require('@tryghost/request');
const UpdateCheckService = require('../../../core/server/services/update-check/update-check-service');

// Verifies the end-to-end wiring of sendCriticalAlertEmail with the real
// GhostMailer and real mail.utils.generateContent renderer — the same
// wiring update-check/index.js builds in production. The unit tests in
// test/unit/server/services/update-check.test.js cover the rendering branches
// in isolation; this test guards against a regression in the integration
// plumbing (template lookup, mailer instance, http response parsing).
describe('UpdateCheck: critical alert email integration', function () {
    let mockUpdateServer;
    let mockUpdateServerPort;
    let mailerSendStub;

    before(testUtils.setup('default'));

    beforeEach(function () {
        mailerSendStub = sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
    });

    afterEach(function () {
        sinon.restore();
        if (mockUpdateServer) {
            mockUpdateServer.close();
            mockUpdateServer = undefined;
        }
    });

    function buildService({checkEndpoint, apiStubs}) {
        const ghostMailer = new mailService.GhostMailer();
        return new UpdateCheckService({
            api: apiStubs,
            config: {
                mail: {transport: 'direct'},
                env: 'testing',
                databaseType: 'sqlite3',
                checkEndpoint,
                isPrivacyDisabled: false,
                notificationGroups: [],
                siteUrl: 'http://localhost:2368/',
                forceUpdate: true,
                ghostVersion: '6.38.0',
                rethrowErrors: true
            },
            request,
            sendEmail: ghostMailer.send.bind(ghostMailer),
            generateEmailContent: mailService.utils.generateContent
        });
    }

    function startMockServer(responseBody) {
        mockUpdateServer = http.createServer((req, res) => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(responseBody));
        });
        mockUpdateServer.listen(0);
        mockUpdateServerPort = mockUpdateServer.address().port;
        return `http://127.0.0.1:${mockUpdateServerPort}`;
    }

    function settingsReadStub(initialNextUpdateCheck = 0) {
        return sinon.stub().callsFake(({key}) => {
            if (key === 'next_update_check') {
                return Promise.resolve({settings: [{value: initialNextUpdateCheck}]});
            }
            if (key === 'db_hash') {
                return Promise.resolve({settings: [{value: 'test-db-hash'}]});
            }
            if (key === 'active_theme') {
                return Promise.resolve({settings: [{value: 'casper'}]});
            }
            return Promise.resolve({settings: []});
        });
    }

    function adminUserStub(email = 'owner@test.com') {
        return sinon.stub().resolves({
            users: [
                {
                    email,
                    created_at: new Date().toISOString(),
                    roles: [{name: 'Owner'}]
                }
            ]
        });
    }

    it('sends a templated HTML email when an alert notification is received', async function () {
        const checkEndpoint = startMockServer({
            next_check: Math.round(Date.now() / 1000) + 86400,
            notifications: [{
                id: 1,
                version: 'all-test',
                custom: 1,
                messages: [{
                    id: '11111111-1111-1111-1111-111111111111',
                    version: '^6',
                    content: '<p>Critical security update available. Upgrade at https://ghost.org/docs/update/</p>',
                    type: 'alert',
                    top: true,
                    dismissible: false
                }],
                created_at: new Date().toISOString()
            }]
        });

        const service = buildService({
            checkEndpoint,
            apiStubs: {
                settings: {
                    read: settingsReadStub(0),
                    edit: sinon.stub().resolves({settings: []})
                },
                posts: {browse: sinon.stub().resolves({meta: {pagination: {total: 0}}})},
                users: {browse: adminUserStub()},
                notifications: {add: sinon.stub().resolves({})}
            }
        });

        await service.check();

        assert.ok(mailerSendStub.called, 'GhostMailer.send should be called');
        const sendArgs = mailerSendStub.firstCall.args[0];
        assert.equal(sendArgs.subject, 'Critical Ghost security update');
        assert.ok(sendArgs.html, 'a rendered HTML body should be present');
        assert.match(sendArgs.html, /<!doctype html/i, 'html body should be a full HTML document');
        assert.match(sendArgs.html, /Critical Ghost security update/, 'html body should include the title');
        assert.match(sendArgs.html, /https?:\/\/[^"<\s]+/, 'html body should reference the site URL');
        assert.match(sendArgs.html, /github\.com\/TryGhost\/Ghost\/security\/advisories/, 'html body should link to security advisories');
        assert.match(sendArgs.html, /docs\.ghost\.org\/update/, 'html body should link to the update docs');
        assert.notEqual(sendArgs.forceTextContent, true, 'should not force text-only rendering');
    });

    it('does not send any email when the notification is informational only', async function () {
        const checkEndpoint = startMockServer({
            next_check: Math.round(Date.now() / 1000) + 86400,
            notifications: [{
                id: 2,
                version: 'all-info',
                custom: 1,
                messages: [{
                    id: '22222222-2222-2222-2222-222222222222',
                    version: '^6',
                    content: '<p>Informational notification</p>',
                    type: 'info',
                    top: true,
                    dismissible: true
                }],
                created_at: new Date().toISOString()
            }]
        });

        const service = buildService({
            checkEndpoint,
            apiStubs: {
                settings: {
                    read: settingsReadStub(0),
                    edit: sinon.stub().resolves({settings: []})
                },
                posts: {browse: sinon.stub().resolves({meta: {pagination: {total: 0}}})},
                users: {browse: adminUserStub()},
                notifications: {add: sinon.stub().resolves({})}
            }
        });

        await service.check();

        assert.ok(!mailerSendStub.called, 'GhostMailer.send should not be called for info-type notifications');
    });
});
