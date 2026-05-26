const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');

const ghostVersion = require('@tryghost/version');
const moment = require('moment');
const Notifications = require('../../../../../core/server/services/notifications/notifications');
const {owner} = require('../../../../utils/fixtures/context');

// In-memory stand-in for NotificationRepository. getAll/getById read the
// backing store; add/edit/deleteById are sinon stubs that also mutate it, so
// call counts can be asserted while reads stay consistent.
function fakeRepository(initial = []) {
    let store = initial.slice();
    return {
        getAll: () => store.map(notification => ({...notification})),
        getById: id => store.find(notification => notification.id === id) ?? null,
        add: sinon.stub().callsFake(async (notification) => {
            store.push(notification);
        }),
        edit: sinon.stub().callsFake(async (notification) => {
            store = store.map(existing => (existing.id === notification.id ? notification : existing));
        }),
        deleteById: sinon.stub().callsFake(async (id) => {
            store = store.filter(notification => notification.id !== id);
        }),
        deleteAll: sinon.stub().resolves()
    };
}

describe('Notifications Service', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        it('adds a single notification when no previous exist', async function () {
            const repository = fakeRepository([]);
            sinon.stub(ghostVersion, 'full').value('4.1.0');
            const notificationsSvc = new Notifications({repository});

            const notificationsToAdd = await notificationsSvc.add({
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

            assert.equal(notificationsToAdd.length, 1);
            sinon.assert.calledOnce(repository.add);

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

        it('skips a notification whose id already exists', async function () {
            const repository = fakeRepository([{id: 'dupe', custom: true, message: 'existing'}]);
            const notificationsSvc = new Notifications({repository});

            const notificationsToAdd = await notificationsSvc.add({
                notifications: [{id: 'dupe', custom: true, message: 'incoming'}]
            });

            assert.equal(notificationsToAdd.length, 0);
            sinon.assert.notCalled(repository.add);
        });

        it('removes existing release notifications when a new release arrives', async function () {
            const repository = fakeRepository([{id: 'old-release', custom: false, message: 'old'}]);
            const notificationsSvc = new Notifications({repository});

            await notificationsSvc.add({
                notifications: [{custom: false, message: 'new release'}]
            });

            sinon.assert.calledOnceWithExactly(repository.deleteById, 'old-release');
            sinon.assert.calledOnce(repository.add);
        });

        it('runs the email reaction for each added notification', async function () {
            const repository = fakeRepository([]);
            const maybeSendEmail = sinon.stub().resolves();
            const notificationsSvc = new Notifications({repository, maybeSendEmail});

            await notificationsSvc.add({
                notifications: [{custom: true, type: 'alert', message: 'critical'}]
            });

            sinon.assert.calledOnce(maybeSendEmail);
            assert.equal(maybeSendEmail.args[0][0].type, 'alert');
        });

        it('does not run the email reaction when nothing is added', async function () {
            const repository = fakeRepository([{id: 'dupe', custom: true, message: 'existing'}]);
            const maybeSendEmail = sinon.stub().resolves();
            const notificationsSvc = new Notifications({repository, maybeSendEmail});

            await notificationsSvc.add({
                notifications: [{id: 'dupe', custom: true, message: 'incoming'}]
            });

            sinon.assert.notCalled(maybeSendEmail);
        });
    });

    describe('browse', function () {
        it('can browse non-major version upgrade notifications', function () {
            const repository = fakeRepository([{
                dismissible: true,
                id: '130f7c24-113a-4768-a698-12a8b34223f1',
                type: 'info',
                message: `<strong>Ghost 5.1.3 is now available</strong> - You are using an old version of Ghost, which means you don't have access to the latest features. <a href=\'https://ghost.org/changelog/4/\' target=\'_blank\' rel=\'noopener\'>Read more!</a>`,
                createdAt: '2021-03-16T12:55:20.000Z',
                addedAt: '2021-03-17T01:41:20.906Z'
            }]);

            sinon.stub(ghostVersion, 'full').value('4.1.0');
            const notificationSvc = new Notifications({repository});

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 1);
        });

        it('can browse major version upgrade notifications', function () {
            const repository = fakeRepository([{
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
            }]);

            sinon.stub(ghostVersion, 'full').value('4.0.0');
            const notificationSvc = new Notifications({repository});

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 1);
        });

        it('cannot see 2.0 version upgrade notifications in Ghost 3.0', function () {
            const repository = fakeRepository([{
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
            }]);

            sinon.stub(ghostVersion, 'full').value('3.0.0');
            const notificationSvc = new Notifications({repository});

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);
        });

        it('cannot see 4.0 version upgrade notifications in Ghost 4.0', function () {
            const repository = fakeRepository([{
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
            }]);

            sinon.stub(ghostVersion, 'full').value('4.0.0');
            const notificationSvc = new Notifications({repository});

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);
        });

        it('cannot see 5.0 version upgrade notifications in Ghost 5.0', function () {
            const repository = fakeRepository([{
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
            }]);

            sinon.stub(ghostVersion, 'full').value('5.0.0');
            const notificationSvc = new Notifications({repository});

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 0);
        });

        it('filters out outdated notifications', function () {
            const repository = fakeRepository([{
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
                id: '130f7c24-113a-4768-a698-12a8b34223f3',
                type: 'info',
                message: 'visible even though without a created at property',
                createdAt: '2021-03-16T12:55:20.000Z',
                addedAt: '2021-03-17T01:41:20.906Z'
            }]);

            sinon.stub(ghostVersion, 'full').value('4.1.0');
            const notificationSvc = new Notifications({repository});

            const notifications = notificationSvc.browse({user: owner});

            assertExists(notifications);
            assert.equal(notifications.length, 2);
            assert.equal(notifications[0].message, 'should be visible');
            assert.equal(notifications[1].message, 'visible even though without a created at property');
        });
    });

    describe('destroy', function () {
        it('marks a dismissible notification as seen by the user', async function () {
            const repository = fakeRepository([{
                id: 'a',
                dismissible: true,
                message: 'dismiss me',
                addedAt: '2021-03-17T01:41:20.906Z',
                seenBy: []
            }]);
            const notificationSvc = new Notifications({repository});

            await notificationSvc.destroy({notificationId: 'a', user: owner});

            sinon.assert.calledOnce(repository.edit);
            const edited = repository.edit.args[0][0];
            assert.equal(edited.seen, true);
            assert.ok(edited.seenBy.includes(owner.id));
        });

        it('rejects dismissal of a non-dismissible notification', async function () {
            const repository = fakeRepository([{id: 'a', dismissible: false, message: 'sticky'}]);
            const notificationSvc = new Notifications({repository});

            await assert.rejects(
                notificationSvc.destroy({notificationId: 'a', user: owner}),
                /do not have permission/i
            );
            sinon.assert.notCalled(repository.edit);
        });

        it('rejects dismissal of a notification that does not exist', async function () {
            const repository = fakeRepository([]);
            const notificationSvc = new Notifications({repository});

            await assert.rejects(
                notificationSvc.destroy({notificationId: 'missing', user: owner}),
                /does not exist/i
            );
            sinon.assert.notCalled(repository.edit);
        });
    });
});
