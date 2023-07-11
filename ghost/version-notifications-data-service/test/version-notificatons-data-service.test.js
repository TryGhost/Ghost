const assert = require('assert/strict');
const sinon = require('sinon');
const VersionNotificationsDataService = require('..');

describe('Version Notification Data Service', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('fetchNotification', function () {
        it('parses and filters out version notifications', async function () {
            const settingsService = {
                read: sinon.stub().resolves({
                    version_notifications: {
                        value: JSON.stringify([
                            'v3.4',
                            'v4.1',
                            'v5.0',
                            'v0.99'
                        ])
                    }
                })
            };

            const versionNotificationsDataService = new VersionNotificationsDataService({
                UserModel: {},
                ApiKeyModel: {},
                settingsService
            });

            assert.equal(await versionNotificationsDataService.fetchNotification('v4.1'), 'v4.1');
            assert.equal(await versionNotificationsDataService.fetchNotification('v9999.1'), undefined);
            assert.equal(await versionNotificationsDataService.fetchNotification('v5'), undefined);
            assert.equal(await versionNotificationsDataService.fetchNotification(), undefined);
        });
    });

    describe('saveNotification', function () {
        it('parses and filters out version notifications', async function () {
            const settingsService = {
                read: sinon.stub().resolves({
                    version_notifications: {
                        value: JSON.stringify([
                            'v3.4',
                            'v4.1',
                            'v5.0',
                            'v0.99'
                        ])
                    }
                }),
                edit: sinon.stub().resolves()
            };

            const versionNotificationsDataService = new VersionNotificationsDataService({
                UserModel: {},
                ApiKeyModel: {},
                settingsService
            });

            await versionNotificationsDataService.saveNotification('v5.0');
            assert.equal(settingsService.edit.called, false);

            await versionNotificationsDataService.saveNotification('v4.0');
            assert.equal(settingsService.edit.called, true);
            assert.deepEqual(settingsService.edit.firstCall.args, [[{
                key: 'version_notifications',
                value: JSON.stringify([
                    'v3.4',
                    'v4.1',
                    'v5.0',
                    'v0.99',
                    'v4.0'
                ])
            }], {
                context: {
                    internal: true
                }
            }]);
        });
    });

    describe('getNotificationEmails', function () {
        it('parses and filters out version notifications', async function () {
            const UserModel = {
                findAll: sinon
                    .stub()
                    .withArgs({
                        withRelated: ['roles'],
                        filter: 'status:active'
                    }, {
                        internal: true
                    })
                    .resolves({
                        toJSON: () => [{
                            email: 'simon@example.com',
                            roles: [{
                                name: 'Administrator'
                            }]
                        }, {
                            email: 'bob@example.com',
                            roles: [{
                                name: 'Owner'
                            }]
                        }, {
                            email: 'joe@example.com',
                            roles: [{
                                name: 'Publisher'
                            }]
                        }]
                    })
            };

            const versionNotificationsDataService = new VersionNotificationsDataService({
                UserModel,
                ApiKeyModel: {},
                settingsService: {}
            });

            const emails = await versionNotificationsDataService.getNotificationEmails();

            assert.equal(UserModel.findAll.called, true);
            assert.deepEqual(emails, ['simon@example.com', 'bob@example.com']);
        });
    });

    describe('getIntegration', function () {
        it('Queries for Content API key when such is provided', async function () {
            const ApiKeyModel = {
                findOne: sinon
                    .stub()
                    .withArgs({
                        secret: 'super_secret'
                    }, {
                        withRelated: ['integration']
                    })
                    .resolves({
                        relations: {
                            integration: {
                                toJSON: () => ({
                                    name: 'live fast die young',
                                    type: 'custom'
                                })
                            }
                        }
                    })
            };

            const versionNotificationsDataService = new VersionNotificationsDataService({
                UserModel: {},
                ApiKeyModel,
                settingsService: {}
            });

            const {name: integrationName, type: integrationType} = await versionNotificationsDataService.getIntegration('super_secret', 'content');

            assert.equal(integrationName, 'live fast die young');
            assert.equal(integrationType, 'custom');
        });

        it('Queries for Admin API key when such is provided', async function () {
            const ApiKeyModel = {
                findOne: sinon
                    .stub()
                    .withArgs({
                        id: 'key_id'
                    }, {
                        withRelated: ['integration']
                    })
                    .resolves({
                        relations: {

                            integration: {
                                toJSON: () => ({
                                    name: 'Tri Hita Karana',
                                    type: 'core'
                                })
                            }
                        }
                    })
            };

            const versionNotificationsDataService = new VersionNotificationsDataService({
                UserModel: {},
                ApiKeyModel,
                settingsService: {}
            });

            const {name: integrationName, type: integrationType} = await versionNotificationsDataService.getIntegration('key_id', 'admin');

            assert.equal(integrationName, 'Tri Hita Karana');
            assert.equal(integrationType, 'core');
        });
    });
});
