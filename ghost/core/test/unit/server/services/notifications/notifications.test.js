const should = require('should');
const sinon = require('sinon');

const ghostVersion = require('@tryghost/version');
const moment = require('moment');
const Notifications = require('../../../../../core/server/services/notifications/Notifications');
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

            allNotifications.length.should.equal(0);
            notificationsToAdd.length.should.equal(1);

            const createdNotification = notificationsToAdd[0];

            createdNotification.id.should.not.be.undefined();
            createdNotification.custom.should.be.true();
            createdNotification.createdAt.should.not.be.undefined();
            createdNotification.status.should.equal('alert');
            createdNotification.type.should.equal('info');
            createdNotification.dismissible.should.be.false();
            createdNotification.top.should.be.true();
            createdNotification.message.should.equal('Hello test world!');
            createdNotification.createdAtVersion.should.equal('4.1.0');
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

            should.exist(notifications);
            notifications.length.should.equal(1);
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

            should.exist(notifications);
            notifications.length.should.equal(1);
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

            should.exist(notifications);
            notifications.length.should.equal(0);
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

            should.exist(notifications);
            notifications.length.should.equal(0);
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

            should.exist(notifications);
            notifications.length.should.equal(0);
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

            should.exist(notifications);
            notifications.length.should.equal(2);
            notifications[0].message.should.equal('should be visible');
            notifications[1].message.should.equal('visible even though without a created at property');
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

            should.exist(notifications);
            notifications.length.should.equal(0);

            settingsModelStub.called.should.equal(true);
            settingsModelStub.args[0][0].should.eql([{
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

            should.exist(notifications);
            notifications.length.should.equal(1);

            settingsModelStub.called.should.equal(false);
        });
    });
});
