const should = require('should');
const _ = require('lodash');
const yaml = require('js-yaml');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const {config} = require('../../../../utils/config-utils');
const schema = require('../../../../../core/server/data/schema/schema');
const fixtures = require('../../../../../core/server/data/schema/fixtures/fixtures.json');
const defaultSettings = require('../../../../../core/server/data/schema/default-settings/default-settings.json');

// Routes are yaml so we can require the file directly
const routeSettings = require('../../../../../core/server/services/route-settings');
routeSettings.init();
const validateRouteSettings = require('../../../../../core/server/services/route-settings/validate');

/**
 * @NOTE
 *
 * If this test fails for you, you have modified one of:
 * - the database schema
 * - fixtures
 * - default settings
 * - routes.yaml
 *
 * When you make a change, please test that:
 *
 * 1. A new blog get's installed and the database looks correct and complete.
 * 2. A blog get's updated from a lower Ghost version and the database looks correct and complete.
 *
 * Typical cases:
 * You have to add a migration script if you've added/modified permissions.
 * You have to add a migration script if you've add a new table.
 * You have to add a migration script if you've added new settings to populate group/flags column.
 */
describe('DB version integrity', function () {
    // Only these variables should need updating
    const currentSchemaHash = '7b3edee6c79a124f6ff53d50558a1949';
    const currentFixturesHash = '4dcbd7b52bc9ce23e6f5f1673118ba73';
    const currentSettingsHash = 'e75a2245c64a4fc82f826676abbc3234';
    const currentRoutesHash = '3d180d52c663d173a6be791ef411ed01';

    // If this test is failing, then it is likely a change has been made that requires a DB version bump,
    // and the values above will need updating as confirmation
    it('should not change without fixing this test', function () {
        const routesPath = path.join(config.get('paths').defaultRouteSettings, 'default-routes.yaml');
        const defaultRoutes = validateRouteSettings(yaml.load(fs.readFileSync(routesPath, 'utf-8')));

        const tablesNoValidation = _.cloneDeep(schema);
        let schemaHash;
        let fixturesHash;
        let settingsHash;
        let routesHash;

        _.each(tablesNoValidation, function (table) {
            return _.each(table, function (column, name) {
                table[name] = _.omit(column, 'validations');
            });
        });

        schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation), 'binary').digest('hex');
        fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures), 'binary').digest('hex');
        settingsHash = crypto.createHash('md5').update(JSON.stringify(defaultSettings), 'binary').digest('hex');
        routesHash = crypto.createHash('md5').update(JSON.stringify(defaultRoutes), 'binary').digest('hex');

        schemaHash.should.eql(currentSchemaHash, 'Database schema has changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        fixturesHash.should.eql(currentFixturesHash, 'Fixtures have changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        settingsHash.should.eql(currentSettingsHash, 'Default settings have changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        routesHash.should.eql(currentRoutesHash, 'Default routes have changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        routesHash.should.eql(routeSettings.getDefaultHash());
    });
});
