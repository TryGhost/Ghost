const find = require('lodash/find');
const should = require('should');
const SettingsImporter = require('../../../../../../core/server/data/importer/importers/data/settings');

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

            should.equal(passwordSetting, undefined);
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

            should.equal(passwordSetting, undefined);
        });

        it('Does not overwrite members from address', function () {
            const fakeSettings = [{
                key: 'members_subscription_settings',
                value: '{"fromAddress":"newemail@example.com"}'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const membersetting = find(importer.dataToImport, {key: 'members_subscription_settings'});
            const membersSettingsVal = JSON.parse(membersetting.value);
            const membersFromAddress = membersSettingsVal.fromAddress;

            should.not.exist(membersFromAddress);
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

            should.exist(problem);
        });
    });
});
