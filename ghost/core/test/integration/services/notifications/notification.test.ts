import assert from 'node:assert/strict';
import sinon from 'sinon';
import nock from 'nock';
import moment from 'moment';

const {agentProvider, fixtureManager, mockManager, resetRateLimits} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const UpdateCheckService = require('../../../../core/server/services/update-check/update-check-service');
const api = require('../../../../core/server/api').endpoints;
const ghostVersion = require('@tryghost/version');

const internal = {context: {internal: true}};

interface StoredNotification {
    id: string;
    custom?: boolean;
    type?: string;
    status?: string;
    message?: string;
    dismissible?: boolean;
    top?: boolean;
    location?: string;
    addedAt?: string;
    createdAtVersion?: string;
    seen?: boolean;
    seenBy?: string[];
}

async function setStoredNotifications(notifications: StoredNotification[]): Promise<void> {
    await models.Settings.edit(
        [{key: 'notifications', value: JSON.stringify(notifications)}],
        internal
    );
}

async function readStoredNotifications(): Promise<StoredNotification[]> {
    const setting = await models.Settings.findOne({key: 'notifications'});
    return JSON.parse(setting.get('value') || '[]');
}

describe('Notification domain (integration)', function () {
    let agent: any;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        await setStoredNotifications([]);
        mockManager.mockMail();
        // Tests switch user contexts repeatedly (loginAsOwner/Editor/Author).
        // Without resetting the rate limiter Ghost's brute-force protection
        // trips partway through the suite.
        await resetRateLimits();
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
        mockManager.restore();
    });

    // ─────────────────────────────────────────────────────────────────
    // Admin API: create
    // ─────────────────────────────────────────────────────────────────

    describe('Admin API: create', function () {
        it('creates a notification with default values applied', async function () {
            await agent
                .post('notifications')
                .body({
                    notifications: [{
                        custom: true,
                        type: 'info',
                        message: 'hello'
                    }]
                })
                .expectStatus(201);

            const {body} = await agent.get('notifications').expectStatus(200);
            assert.equal(body.notifications.length, 1);
            const created = body.notifications[0];
            assert.equal(created.message, 'hello');
            assert.equal(created.type, 'info');
            assert.equal(created.dismissible, true);
            assert.equal(created.status, 'alert');
            assert.equal(created.location, 'bottom');
            assert.ok(created.id);
        });

        it('does not create a second notification when one already exists with the same id', async function () {
            const id = '5fe1fb4ac8b9b900015a1bb1';
            await agent
                .post('notifications')
                .body({notifications: [{id, custom: true, type: 'info', message: 'one'}]})
                .expectStatus(201);
            await agent
                .post('notifications')
                .body({notifications: [{id, custom: true, type: 'info', message: 'two'}]});

            const {body} = await agent.get('notifications').expectStatus(200);
            const matching = body.notifications.filter((n: any) => n.id === id);
            assert.equal(matching.length, 1);
            assert.equal(matching[0].message, 'one');
        });

        it('replaces any existing release notification when a new release notification arrives', async function () {
            await setStoredNotifications([{
                id: 'old-release',
                custom: false,
                message: 'old release',
                type: 'info',
                status: 'alert',
                dismissible: true,
                location: 'bottom',
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full
            }]);

            await agent
                .post('notifications')
                .body({notifications: [{custom: false, type: 'info', message: 'new release'}]})
                .expectStatus(201);

            const {body} = await agent.get('notifications').expectStatus(200);
            assert.equal(body.notifications.length, 1);
            assert.equal(body.notifications[0].message, 'new release');
            assert.notEqual(body.notifications[0].id, 'old-release');
        });

        it('allows an Editor to create a notification', async function () {
            await agent.loginAsEditor();
            await agent
                .post('notifications')
                .body({notifications: [{custom: true, type: 'info', message: 'editor created'}]})
                .expectStatus(201);

            await agent.loginAsOwner();
            const {body} = await agent.get('notifications').expectStatus(200);
            const matching = body.notifications.filter((n: any) => n.message === 'editor created');
            assert.equal(matching.length, 1);
        });

        it('forbids an Author from creating a notification', async function () {
            await agent.loginAsAuthor();
            await agent
                .post('notifications')
                .body({notifications: [{custom: true, type: 'info', message: 'nope'}]})
                .expectStatus(403);

            await agent.loginAsOwner();
            const {body} = await agent.get('notifications').expectStatus(200);
            const matching = body.notifications.filter((n: any) => n.message === 'nope');
            assert.equal(matching.length, 0);
        });

        it('sends an alert email when an alert-type notification is created via the Admin API', async function () {
            await agent
                .post('notifications')
                .body({notifications: [{custom: true, type: 'alert', message: 'critical alert'}]})
                .expectStatus(201);

            mockManager.assert.sentEmail({
                to: /@/,
                subject: /Action required: Critical alert from Ghost instance/
            });
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // Admin API: browse
    // ─────────────────────────────────────────────────────────────────

    describe('Admin API: browse', function () {
        it('returns each notification with the user-facing fields populated', async function () {
            await setStoredNotifications([{
                id: 'a',
                custom: true,
                type: 'info',
                message: 'visible',
                status: 'alert',
                dismissible: true,
                location: 'bottom',
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full,
                seenBy: []
            }]);

            const {body} = await agent.get('notifications').expectStatus(200);
            assert.equal(body.notifications.length, 1);
            const n = body.notifications[0];
            assert.equal(n.id, 'a');
            assert.equal(n.message, 'visible');
            assert.equal(n.type, 'info');
            assert.equal(n.status, 'alert');
            assert.equal(n.dismissible, true);
            assert.equal(n.location, 'bottom');
            assert.equal(n.custom, true);
        });

        it('does not return notifications targeted at an older Ghost version', async function () {
            await setStoredNotifications([{
                id: 'old',
                custom: true,
                type: 'info',
                message: 'too old to show',
                createdAtVersion: '0.0.1',
                addedAt: new Date().toISOString()
            }, {
                id: 'current',
                custom: true,
                type: 'info',
                message: 'should be visible',
                createdAtVersion: ghostVersion.full,
                addedAt: new Date().toISOString()
            }]);

            const {body} = await agent.get('notifications').expectStatus(200);
            const ids = body.notifications.map((n: any) => n.id).sort();
            assert.deepEqual(ids, ['current']);
        });

        it('does not return notifications the calling user has already dismissed', async function () {
            const ownerUser = await models.User.findOne({slug: 'joe-bloggs'});
            const ownerId = ownerUser.id;
            await setStoredNotifications([{
                id: 'a',
                custom: true,
                type: 'info',
                message: 'dismissed by owner',
                dismissible: true,
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full,
                seenBy: [ownerId]
            }, {
                id: 'b',
                custom: true,
                type: 'info',
                message: 'visible to owner',
                dismissible: true,
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full,
                seenBy: []
            }]);

            const {body} = await agent.get('notifications').expectStatus(200);
            const ids = body.notifications.map((n: any) => n.id).sort();
            assert.deepEqual(ids, ['b']);
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // Admin API: destroy
    // ─────────────────────────────────────────────────────────────────

    describe('Admin API: destroy', function () {
        it('no longer returns a notification in the browse response after the calling user dismisses it', async function () {
            await setStoredNotifications([{
                id: 'a',
                custom: true,
                type: 'info',
                message: 'dismiss me',
                dismissible: true,
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full,
                seenBy: []
            }]);

            const before = await agent.get('notifications').expectStatus(200);
            assert.equal(before.body.notifications.filter((n: any) => n.id === 'a').length, 1);

            await agent.delete('notifications/a').expectStatus(204);

            const after = await agent.get('notifications').expectStatus(200);
            assert.equal(after.body.notifications.filter((n: any) => n.id === 'a').length, 0);
        });

        it('rejects dismissal of a notification flagged as non-dismissible', async function () {
            await setStoredNotifications([{
                id: 'a',
                custom: true,
                type: 'info',
                message: 'sticky',
                dismissible: false,
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full
            }]);

            await agent.delete('notifications/a').expectStatus(403);
        });

        it('does not affect other users when one user dismisses a shared notification', async function () {
            await setStoredNotifications([{
                id: 'a',
                custom: true,
                type: 'info',
                message: 'multi-user',
                dismissible: true,
                addedAt: new Date().toISOString(),
                createdAtVersion: ghostVersion.full,
                seenBy: []
            }]);

            await agent.delete('notifications/a').expectStatus(204);

            await agent.loginAsAdmin();
            const {body} = await agent.get('notifications').expectStatus(200);
            const visibleIds = body.notifications.map((n: any) => n.id);
            assert.ok(visibleIds.includes('a'), 'admin should still see the notification');

            await agent.loginAsOwner();
            const {body: ownerBody} = await agent.get('notifications').expectStatus(200);
            const ownerIds = ownerBody.notifications.map((n: any) => n.id);
            assert.equal(ownerIds.includes('a'), false, 'owner should not see the dismissed notification');
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // UpdateCheck producer
    // ─────────────────────────────────────────────────────────────────

    describe('UpdateCheck producer', function () {
        function buildService() {
            const {notifications} = require('../../../../core/server/services/notifications');
            return new UpdateCheckService({
                api: {
                    settings: {
                        read: api.settings.read,
                        edit: api.settings.edit
                    },
                    posts: {browse: api.posts.browse},
                    users: {browse: api.users.browse}
                },
                notifications,
                config: {
                    mail: {},
                    env: 'testing',
                    databaseType: 'sqlite3',
                    checkEndpoint: 'https://updates.example.test',
                    isPrivacyDisabled: true,
                    siteUrl: 'http://127.0.0.1:2369',
                    ghostVersion: ghostVersion.original,
                    forceUpdate: true,
                    rethrowErrors: true
                },
                request: require('@tryghost/request')
            });
        }

        function mockEndpoint(body: any) {
            nock('https://updates.example.test')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify(body), {'Content-Type': 'application/json'});
        }

        it('produces a notification with the expected shape from a release-style wire response', async function () {
            const messageId = '11111111-1111-4111-8111-111111111111';
            mockEndpoint({
                id: 1,
                custom: 0,
                next_check: moment().add(1, 'day').unix(),
                messages: [{
                    id: messageId,
                    version: 'all4',
                    content: '<p>Ghost X is now available</p>',
                    dismissible: true,
                    top: true
                }]
            });

            await buildService().check();

            const stored = await readStoredNotifications();
            assert.equal(stored.length, 1);
            const n = stored[0];
            assert.equal(n.id, messageId);
            assert.equal(n.message, '<p>Ghost X is now available</p>');
            assert.equal(n.type, 'info');
            assert.equal(n.custom, false);
            assert.equal(n.dismissible, true);
            assert.equal(n.top, true);
            assert.equal(n.createdAtVersion, ghostVersion.full);
            assert.deepEqual(n.seenBy, []);
        });

        it('sends an alert email to Owner and Administrator users when the update-check service publishes an alert', async function () {
            const messageId = '22222222-2222-4222-8222-222222222222';
            mockEndpoint({
                id: 2,
                custom: 1,
                version: 'all',
                next_check: moment().add(1, 'day').unix(),
                messages: [{
                    id: messageId,
                    version: 'custom1',
                    content: '<p>Critical security update</p>',
                    dismissible: false,
                    top: true,
                    type: 'alert'
                }]
            });

            await buildService().check();

            mockManager.assert.sentEmail({
                to: /@/,
                subject: /^Action required: Critical alert from Ghost instance http:\/\//
            });
        });

        it('does not send an email for non-alert notifications from the update-check service', async function () {
            mockEndpoint({
                id: 3,
                custom: 1,
                version: 'all',
                next_check: moment().add(1, 'day').unix(),
                messages: [{
                    id: '33333333-3333-4333-8333-333333333333',
                    version: 'custom2',
                    content: '<p>Routine info</p>',
                    type: 'info'
                }]
            });

            await buildService().check();

            mockManager.assert.sentEmailCount(0);
        });

        it('stores the same update-check message only once across consecutive poll cycles', async function () {
            const messageId = '44444444-4444-4444-8444-444444444444';
            const payload = {
                id: 4,
                custom: 1,
                version: 'all',
                next_check: moment().add(1, 'day').unix(),
                messages: [{
                    id: messageId,
                    version: 'custom3',
                    content: '<p>Repeat</p>',
                    type: 'info'
                }]
            };
            mockEndpoint(payload);
            await buildService().check();
            mockEndpoint(payload);
            await buildService().check();

            const stored = await readStoredNotifications();
            assert.equal(stored.filter(n => n.id === messageId).length, 1);
        });
    });
});
