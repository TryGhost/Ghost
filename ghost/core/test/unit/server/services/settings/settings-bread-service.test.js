const sinon = require('sinon');
const assert = require('node:assert/strict');
const mail = require('../../../../../core/server/services/mail');
const SettingsBreadService = require('../../../../../core/server/services/settings/settings-bread-service');
const urlUtils = require('../../../../../core/shared/url-utils.js');
const {mockManager} = require('../../../../utils/e2e-framework');
const emailAddress = require('../../../../../core/server/services/email-address');
describe('UNIT > Settings BREAD Service:', function () {
    let emailMockReceiver;

    beforeEach(function () {
        emailAddress.init();
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
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
                mail,
                urlUtils,
                singleUseTokenProvider: {},
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
                mail,
                urlUtils,
                singleUseTokenProvider: {},
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
                mail,
                urlUtils,
                singleUseTokenProvider: {},
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
                mail,
                urlUtils,
                singleUseTokenProvider: {},
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

    describe('edit', function () {
        it('cannot set stripe_connect_secret_key ', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {
                    async edit(changes) {
                        assert.equal(changes.length, 0);
                        return changes;
                    }
                },
                settingsCache: {},
                mail,
                urlUtils,
                singleUseTokenProvider: {},
                labsService: {}
            });

            const settings = await defaultSettingsManager.edit([
                {
                    key: 'stripe_connect_secret_key',
                    value: 'test'
                }
            ], {}, null);

            assert.equal(settings.length, 0);
        });

        it('setting members_support_address triggers email verification', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {
                    async edit(changes) {
                        assert.equal(changes.length, 0);
                        return changes;
                    }
                },
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
                mail,
                urlUtils,
                singleUseTokenProvider: {
                    create() {
                        return 'test';
                    }
                },
                labsService: {
                    isSet() {
                        return false;
                    }
                },
                emailAddressService: {
                    service: {
                        validate() {
                            return {
                                allowed: true,
                                verificationEmailRequired: true
                            };
                        },
                        defaultFromAddress: 'noreply@example.com'
                    }
                }
            });

            const settings = await defaultSettingsManager.edit([
                {
                    key: 'members_support_address',
                    value: 'support@example.com'
                }
            ], {}, null);

            assert.equal(settings.length, 0);
            assert.deepEqual(settings.meta.sent_email_verification, ['members_support_address']);

            emailMockReceiver.matchHTMLSnapshot();
            emailMockReceiver.matchPlaintextSnapshot();
            emailMockReceiver.matchMetadataSnapshot();
        });
    });

    describe('publicSiteAccess limit', function () {
        const siteSettings = {
            is_private: {key: 'is_private', value: true, group: 'site'},
            password: {key: 'password', value: 'silver042', group: 'site'}
        };

        function createService({isDisabled = false} = {}) {
            return new SettingsBreadService({
                SettingsModel: {
                    async edit(changes) {
                        return changes.map(change => ({toJSON: () => ({...siteSettings[change.key], ...change})}));
                    }
                },
                settingsCache: {
                    get: key => siteSettings[key],
                    getAll: () => ({...siteSettings})
                },
                mail,
                urlUtils,
                singleUseTokenProvider: {},
                labsService: {getAll: () => ({})},
                limitsService: {
                    isDisabled: sinon.stub().withArgs('publicSiteAccess').returns(isDisabled)
                }
            });
        }

        describe('browse', function () {
            it('marks is_private and password as is_read_only when the limit is disabled', async function () {
                const service = createService({isDisabled: true});

                const settings = await service.browse({user: 'test'});
                const byKey = Object.fromEntries(settings.map(s => [s.key, s]));

                assert.equal(byKey.is_private.is_read_only, true);
                assert.equal(byKey.password.is_read_only, true);
            });

            it('does not mark is_private or password as is_read_only when the limit is not disabled', async function () {
                const service = createService({isDisabled: false});

                const settings = await service.browse({user: 'test'});
                const byKey = Object.fromEntries(settings.map(s => [s.key, s]));

                assert.equal(byKey.is_private.is_read_only, undefined);
                assert.equal(byKey.password.is_read_only, undefined);
            });
        });

        describe('edit', function () {
            it('rejects external attempts to set is_private = false when the limit is disabled', async function () {
                const service = createService({isDisabled: true});

                await assert.rejects(
                    service.edit([{key: 'is_private', value: false}], {context: {user: 'test'}}, null),
                    /Site visibility and access code cannot be changed/
                );
            });

            it('rejects external attempts to change password when the limit is disabled', async function () {
                const service = createService({isDisabled: true});

                await assert.rejects(
                    service.edit([{key: 'password', value: 'attacker-chosen-code'}], {context: {user: 'test'}}, null),
                    /Site visibility and access code cannot be changed/
                );
            });

            it('allows is_private = true (no-op) when the limit is disabled', async function () {
                const service = createService({isDisabled: true});

                const settings = await service.edit([{key: 'is_private', value: true}], {context: {user: 'test'}}, null);

                assert.equal(settings.find(s => s.key === 'is_private').value, true);
            });

            it('allows internal context to edit is_private and password when the limit is disabled', async function () {
                const service = createService({isDisabled: true});

                const settings = await service.edit([
                    {key: 'is_private', value: false},
                    {key: 'password', value: 'regenerated-by-ghost'}
                ], {context: {internal: true}}, null);

                assert.equal(settings.find(s => s.key === 'is_private').value, false);
                assert.equal(settings.find(s => s.key === 'password').value, 'regenerated-by-ghost');
            });

            it('does not block edits when the limit is not disabled', async function () {
                const service = createService({isDisabled: false});

                const settings = await service.edit([
                    {key: 'is_private', value: false},
                    {key: 'password', value: 'user-chosen'}
                ], {context: {user: 'test'}}, null);

                assert.equal(settings.find(s => s.key === 'is_private').value, false);
                assert.equal(settings.find(s => s.key === 'password').value, 'user-chosen');
            });
        });
    });

    describe('verifyKeyUpdate', function () {
        it('can set members_support_address', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {
                    async edit(changes) {
                        assert.deepEqual(changes, {
                            key: 'members_support_address',
                            value: 'support@example.com'
                        });
                        return changes;
                    }
                },
                settingsCache: {},
                mail,
                urlUtils,
                singleUseTokenProvider: {
                    validate(token) {
                        assert.equal(token, 'test');

                        return {
                            key: 'members_support_address',
                            value: 'support@example.com'
                        };
                    }
                },
                labsService: {}
            });

            const settings = await defaultSettingsManager.verifyKeyUpdate('test');
            assert.deepEqual(settings, {
                key: 'members_support_address',
                value: 'support@example.com'
            });
        });

        it('can not set other fields', async function () {
            const defaultSettingsManager = new SettingsBreadService({
                SettingsModel: {},
                settingsCache: {},
                mail,
                urlUtils,
                singleUseTokenProvider: {
                    validate(token) {
                        assert.equal(token, 'test');

                        return {
                            key: 'members_support_address_invalid',
                            value: 'support@example.com'
                        };
                    }
                },
                labsService: {}
            });

            await assert.rejects(defaultSettingsManager.verifyKeyUpdate('test'), /Not allowed to update this setting key via tokens/);
        });
    });
});
