const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../../utils/assertions');
const find = require('lodash/find');
const SettingsImporter = require('../../../../../../../core/server/data/importer/importers/data/settings-importer');

describe('SettingsImporter', function () {
    describe('#beforeImport', function () {
        it('Removes the password setting', function () {
            const fakeSettings = [{
                key: 'password',
                value: 'hunter2'
            }, {
                key: 'is_private',
                value: true
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const passwordSetting = find(importer.dataToImport, {key: 'password'});

            assert.equal(passwordSetting, undefined);
        });

        it('Removes the is_private setting', function () {
            const fakeSettings = [{
                key: 'password',
                value: 'hunter2'
            }, {
                key: 'is_private',
                value: true
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const passwordSetting = find(importer.dataToImport, {key: 'is_private'});

            assert.equal(passwordSetting, undefined);
        });

        it('Does not overwrite members from address', function () {
            const fakeSettings = [{
                key: 'members_from_address',
                value: 'newemail@example.com'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const membersFromAddress = find(importer.dataToImport, {key: 'members_from_address'});

            assert.equal(membersFromAddress, undefined);
        });

        it('Does not overwrite members support address', function () {
            const fakeSettings = [{
                key: 'members_support_address',
                value: 'newemail@example.com'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const membersSupportAddress = find(importer.dataToImport, {key: 'members_support_address'});

            assert.equal(membersSupportAddress, undefined);
        });

        it('Does not overwrite email_verification_required setting', function () {
            const fakeSettings = [{
                key: 'email_verification_required',
                value: true,
                flags: 'RO'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const emailVerificationRequired = find(importer.dataToImport, {key: 'email_verification_required'});

            assert.equal(emailVerificationRequired, undefined);
        });

        it('Does not overwrite site_uuid setting', function () {
            const fakeSettings = [{
                key: 'site_uuid',
                value: 'e7914916-e990-4a1b-b371-07a56798b2aa',
                flags: 'PUBLIC,RO'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const siteUuid = find(importer.dataToImport, {key: 'site_uuid'});

            assert.equal(siteUuid, undefined);
        });

        it('Adds a problem if the existing data is_private is false, and new data is_private is true', function () {
            const fakeSettings = [{
                key: 'password',
                value: 'hunter2'
            }, {
                key: 'is_private',
                value: true
            }];

            const fakeExistingSettings = [{
                key: 'is_private',
                value: false
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.existingData = fakeExistingSettings;
            importer.beforeImport();

            const problem = find(importer.problems, {
                message: 'IMPORTANT: Content in this import was previously published on a private Ghost install, but the current site is public. Are your privacy settings up to date?'
            });

            assertExists(problem);
        });

        it('Adds a problem if unable to parse data from slack configuration', function () {
            const fakeSettings = [{
                key: 'slack',
                value: 'invalid JSON here'
            }];

            const fakeExistingSettings = [{
                key: 'slack_username',
                value: 'Ghost'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.existingData = fakeExistingSettings;
            importer.beforeImport();

            const problem = find(importer.problems, {
                message: 'Failed to parse the value of slack setting value'
            });

            assertExists(problem);
        });

        it('Ignores slack URL from import files in all forms', function () {
            const fakeSettings = [{
                key: 'slack',
                value: `[{"url":"https://slack.url","username":"Test Name"}]`,
                created_at: '2021-02-10T01:26:08.452Z',
                updated_at: '2021-02-10T01:26:08.452Z'
            }, {
                key: 'slack_url',
                value: 'https://second-slack.url',
                created_at: '2021-02-10T01:26:08.452Z',
                updated_at: '2021-02-10T01:26:08.452Z'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            assert.equal(importer.problems.length, 0);

            assert.equal(importer.dataToImport.length, 1);
            assert.equal(importer.dataToImport[0].key, 'slack_username');
            assert.equal(importer.dataToImport[0].value, 'Test Name');
        });

        it('Renames the members_allow_free_signup setting', function () {
            const fakeSettings = [{
                key: 'members_allow_free_signup',
                type: 'boolean',
                value: false
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            assert.equal(importer.problems.length, 0);

            assert.equal(importer.dataToImport.length, 1);
            assert.equal(importer.dataToImport[0].key, 'members_signup_access');
            assert.equal(importer.dataToImport[0].value, 'invite');
            assert.equal(importer.dataToImport[0].type, 'string');
        });
    });
});
