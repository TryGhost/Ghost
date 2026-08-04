const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');

const ghostVersion = require('@tryghost/version');
const moment = require('moment');
const Notifications = require('../../../../../core/server/services/notifications/notifications');
const {owner} = require('../../../../utils/fixtures/context');

describe('Notifications Service', function () {
    describe('add', function () {
        it('adds a single notification when no previous exist', function () {
            const existingNotifications = [];
            const settingsCache = {
                get: sinon.fake.returns(existingNotifications)
            };

            sinon.stub(ghostVersion, 'full').value('4.1.0');
            const notificationsSvc = new Notifications({
                settingsCache
            });

            const {allNotifications, notificationsToAdd} = notificationsSvc.add({
                notifications: [{
                    custom: true,
                    createdAt: moment().toDate(),
                    status: 'alert',
                    type: 'info',
                    dismissible: false,
                    top: true,
                    message: 'Hello test world!'
                }]
            });

            assert.equal(allNotifications.length, 0);
            assert.equal(notificationsToAdd.length, 1);

            const createdNotification = notificationsToAdd[0];

            assertExists(createdNotification.id);
            assert.equal(createdNotification.custom, true);
            assertExists(createdNotification.createdAt);
            assert.equal(createdNotification.status, 'alert');
            assert.equal(createdNotification.type, 'info');
            assert.equal(createdNotification.dismissible, false);
            assert.equal(createdNotification.top, true);
            assert.equal(createdNotification.message, 'Hello test world!');
            assert.equal(createdNotification.createdAtVersion, '4.1.0');
        });

        it('strips scripts and event handlers from the message before storing', function () {
            const settingsCache = {
                get: sinon.fake.returns([])
            };

            const notificationsSvc = new Notifications({settingsCache});

            const {notificationsToAdd} = notificationsSvc.add({
                notifications: [{
                    custom: true,
                    status: 'alert',
                    message: '<b>ok</b><img src=x onerror="alert(1)"><script>alert(2)</script>'
                }]
            });

            const message = notificationsToAdd[0].message;

            assert.equal(message.includes('onerror'), false);
            assert.equal(message.includes('<script'), false);
            assert.equal(message.includes('<img'), false);
            assert.equal(message.includes('<b>ok</b>'), true);
        });

        it('leaves a non-string message untouched for the caller to reject', function () {
            const settingsCache = {
                get: sinon.fake.returns([])
            };

            const notificationsSvc = new Notifications({settingsCache});

            const {notificationsToAdd} = notificationsSvc.add({
                notifications: [{custom: true, status: 'alert', message: {nested: 'object'}}]
            });

            assert.deepEqual(notificationsToAdd[0].message, {nested: 'object'});
        });
    });

    describe('fetchAllNotifications', function () {
        it('sanitises unsafe HTML that is already stored in settings', function () {
            // Installs upgrading from a version without write-side sanitisation
            // can hold unsafe HTML in the `notifications` setting already, and
            // Ghost Admin renders notification bodies unescaped.
            const settingsCache = {
                get: sinon.fake.returns([{
                    id: '130f7c24-113a-4768-a698-12a8b34223f1',
                    dismissible: true,
                    status: 'alert',
                    message: '<b>stored</b><img src=x onerror="alert(1)">',
                    addedAt: '2026-08-04T10:00:00.000Z'
                }])
            };

            const notificationsSvc = new Notifications({settingsCache});
            const [notification] = notificationsSvc.fetchAllNotifications();

            assert.equal(notification.message.includes('onerror'), false);
            assert.equal(notification.message.includes('<img'), false);
            assert.equal(notification.message.includes('<b>stored</b>'), true);
        });
    });

    describe('browse', function () {
        it('can browse non-major version upgrade notifications', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    dismissible: true,
                    id: '130f7c24-113a-4768-a698-12a8b34223f1',
                    type: 'info',
                    message: `<strong>Ghost 5.1.3 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features. <a href=\'https://ghost.org/changelog/4/\' target=\'_blank\' rel=\'noopener\'>Read more!</a>`,
                    createdAt: '2021-03-16T12:55:20.000Z',
                    addedAt: '2021-03-17T01:41:20.906Z'
                }])
            };

            sinon.stub(ghostVersion, 'full').value('4.1.0');
            const notificationSvc = new Notifications({
                settingsCache
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 1);
        });

        it('can browse major version upgrade notifications', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    dismissible: true,
                    location: 'bottom',
                    status: 'alert',
                    id: '130f7c24-113a-4768-a698-12a8b34223f6',
                    custom: true,
                    createdAt: '2021-03-16T12:55:20.000Z',
                    type: 'info',
                    top: true,
                    message: `<strong>Ghost 5.0 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features. <a href=\'https://ghost.org/changelog/4/\' target=\'_blank\' rel=\'noopener\'>Read more!</a>`,
                    seen: true,
                    addedAt: '2021-03-17T01:41:20.906Z',
                    seenBy: ['1']
                }])
            };

            sinon.stub(ghostVersion, 'full').value('4.0.0');
            const notificationSvc = new Notifications({
                settingsCache
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 1);
        });

        it('cannot see 2.0 version upgrade notifications in Ghost 3.0', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    dismissible: true,
                    location: 'bottom',
                    status: 'alert',
                    id: '130f7c24-113a-4768-a698-12a8b34223f7',
                    custom: true,
                    createdAt: '2020-03-16T12:55:20.000Z',
                    type: 'info',
                    top: true,
                    message: `<strong>Ghost 2.0 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features.`,
                    seen: true,
                    addedAt: '2020-03-17T01:41:20.906Z',
                    seenBy: ['1']
                }])
            };

            sinon.stub(ghostVersion, 'full').value('3.0.0');
            const notificationSvc = new Notifications({
                settingsCache
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);
        });

        it('cannot see 4.0 version upgrade notifications in Ghost 4.0', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    dismissible: true,
                    location: 'bottom',
                    status: 'alert',
                    id: '130f7c24-113a-4768-a698-12a8b34223f8',
                    custom: true,
                    createdAt: '2021-03-16T12:55:20.000Z',
                    type: 'info',
                    top: true,
                    message: `<strong>Ghost 4.0 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features.`,
                    seen: true,
                    addedAt: '2021-03-17T01:41:20.906Z',
                    seenBy: ['1']
                }])
            };

            sinon.stub(ghostVersion, 'full').value('4.0.0');
            const notificationSvc = new Notifications({
                settingsCache
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);
        });

        it('cannot see 5.0 version upgrade notifications in Ghost 5.0', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    dismissible: true,
                    location: 'bottom',
                    status: 'alert',
                    id: '130f7c24-113a-4768-a698-12a8b34223f9',
                    custom: true,
                    createdAt: '2022-03-16T12:55:20.000Z',
                    type: 'info',
                    top: true,
                    message: `<strong>Ghost 5.0 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features.`,
                    seen: true,
                    addedAt: '2022-03-17T01:41:20.906Z',
                    seenBy: ['1']
                }])
            };

            sinon.stub(ghostVersion, 'full').value('5.0.0');
            const notificationSvc = new Notifications({
                settingsCache
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);
        });

        it('filters out outdated notifications', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    dismissible: true,
                    custom: true,
                    id: '130f7c24-113a-4768-a698-12a8b34223f1',
                    type: 'info',
                    message: 'too old to show',
                    createdAt: '2021-03-16T12:55:20.000Z',
                    addedAt: '2021-03-17T01:41:20.906Z',
                    createdAtVersion: '4.0.1'
                }, {
                    dismissible: true,
                    custom: true,
                    id: '130f7c24-113a-4768-a698-12a8b34223f2',
                    type: 'info',
                    message: 'should be visible',
                    createdAt: '2021-03-16T12:55:20.000Z',
                    addedAt: '2021-03-17T01:41:20.906Z',
                    createdAtVersion: '4.1.0'
                }, {
                    dismissible: true,
                    custom: true,
                    id: '130f7c24-113a-4768-a698-12a8b34223f2',
                    type: 'info',
                    message: 'visible even though without a created at property',
                    createdAt: '2021-03-16T12:55:20.000Z',
                    addedAt: '2021-03-17T01:41:20.906Z'
                }])
            };

            sinon.stub(ghostVersion, 'full').value('4.1.0');
            const notificationSvc = new Notifications({
                settingsCache
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 2);
            assert.equal(notifications[0].message, 'should be visible');
            assert.equal(notifications[1].message, 'visible even though without a created at property');
        });
    });

    describe('Stored notifications data corruption recovery', function () {
        it('should correct broken notifications data on browse', function () {
            const settingsCache = {
                get: sinon.fake.returns({
                    message: 'this object should be an array!'
                })
            };
            const settingsModelStub = sinon.stub().resolves();

            const notificationSvc = new Notifications({
                settingsCache,
                SettingsModel: {
                    edit: settingsModelStub
                }
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);

            sinon.assert.called(settingsModelStub);
            assert.deepEqual(settingsModelStub.args[0][0], [{
                key: 'notifications',
                value: '[]'
            }]);
        });

        it('does not trigger correction when the data is in valid format', function () {
            const settingsCache = {
                get: sinon.fake.returns([{
                    message: 'this works! 5.1.0'
                }])
            };
            const settingsModelStub = sinon.stub().resolves();

            sinon.stub(ghostVersion, 'full').value('5.0.0');
            const notificationSvc = new Notifications({
                settingsCache,
                SettingsModel: {
                    edit: settingsModelStub
                }
            });

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 1);

            sinon.assert.notCalled(settingsModelStub);
        });
    });
});
