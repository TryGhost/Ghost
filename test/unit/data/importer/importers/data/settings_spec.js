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
                key: 'members_from_address',
                value: 'newemail@example.com'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const membersFromAddress = find(importer.dataToImport, {key: 'members_from_address'});

            should.not.exist(membersFromAddress);
        });

        it('Does not overwrite members support address', function () {
            const fakeSettings = [{
                key: 'members_support_address',
                value: 'newemail@example.com'
            }];

            const importer = new SettingsImporter({settings: fakeSettings}, {dataKeyToImport: 'settings'});

            importer.beforeImport();

            const membersSupportAddress = find(importer.dataToImport, {key: 'members_support_address'});

            should.not.exist(membersSupportAddress);
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

            should.exist(problem);
        });
    });
});
