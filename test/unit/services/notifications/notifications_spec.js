const should = require('should');
const sinon = require('sinon');

const Notifications = require('../../../../core/server/services/notifications/notifications');
const {owner} = require('../../../utils/fixtures/context');

describe('Notifications Service', function () {
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

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '4.1.0'
            }
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

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '4.0.0'
            }
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

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '3.0.0'
            }
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

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '4.0.0'
            }
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

        const notificationSvc = new Notifications({
            settingsCache,
            ghostVersion: {
                full: '5.0.0'
            }
        });

        const notifications = notificationSvc.browse({user: owner});

        should.exist(notifications);
        notifications.length.should.equal(0);
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
                ghostVersion: {
                    full: '5.0.0'
                },
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

            const notificationSvc = new Notifications({
                settingsCache,
                ghostVersion: {
                    full: '5.0.0'
                },
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
