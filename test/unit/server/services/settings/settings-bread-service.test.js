const sinon = require('sinon');
const assert = require('assert');

const SettingsBreadService = require('../../../../../core/server/services/settings/settings-bread-service');

describe('UNIT > Settings BREAD Service:', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('read', function () {
        it('returns the setting ', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {},
                settingsCache: {
                    get: sinon
                        .stub()
                        .withArgs('version_notifications', {resolve: false})
                        .returns({
                            key: 'portal_button_signup_text',
                            value: 'Subscribe',
                            group: 'portal'
                        })
                },
                labsService: {}
            });

            const setting = await defaultSettingsManager.read('version_notifications');

            assert.deepEqual(setting, {
                version_notifications: {
                    key: 'portal_button_signup_text',
                    value: 'Subscribe',
                    group: 'portal'
                }
            });
        });

        it('can read core group with internal context', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {},
                settingsCache: {
                    get: sinon
                        .stub()
                        .withArgs('version_notifications', {resolve: false})
                        .returns({
                            key: 'version_notifications',
                            value: '[\'4.0\']',
                            group: 'core'
                        })
                },
                labsService: {}
            });

            const setting = await defaultSettingsManager.read('version_notifications', {internal: true});

            assert.deepEqual(setting, {
                version_notifications: {
                    group: 'core',
                    key: 'version_notifications',
                    value: '[\'4.0\']'
                }
            });
        });

        it('throws and error when reading a core group without internal context', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {},
                settingsCache: {
                    get: sinon
                        .stub()
                        .withArgs('version_notifications', {resolve: false})
                        .returns({
                            key: 'version_notifications',
                            value: '[\'4.0\']',
                            group: 'core'
                        })
                },
                labsService: {}
            });

            try {
                await defaultSettingsManager.read('version_notifications');
                throw ('above line should have thrown');
            } catch (error) {
                assert.equal(error.errorType, 'NoPermissionError');
                assert.equal(error.message, 'Attempted to access core setting from external request');
            }
        });

        it('throws an error when reading unknown setting', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {},
                settingsCache: {
                    get: sinon
                        .stub()
                        .withArgs('unknown_setting', {resolve: false})
                        .returns(null)
                },
                labsService: {}
            });

            try {
                await defaultSettingsManager.read('unknown_setting');
                throw ('above line should have thrown');
            } catch (error) {
                assert.equal(error.errorType, 'NotFoundError');
                assert.equal(error.message, 'Problem finding setting: unknown_setting');
            }
        });
    });
});
