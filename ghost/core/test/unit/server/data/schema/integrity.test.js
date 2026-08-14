const assert = require('node:assert/strict');
const _ = require('lodash');
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
const {parseRouteSettings} = require('../../../../../core/server/services/route-settings/route-settings-parser');
const parseYaml = require('../../../../../core/server/services/route-settings/yaml-parser');

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
    const currentSchemaHash = '47fc91e205277e2c751ff58592785240';
    const currentFixturesHash = '4e0c7b4fe3c1593e9d1fae1a891389ca';
    const currentSettingsHash = '8650db85b9a61afe4797ad6333066c62';
    const currentRoutesHash = 'd8c25fa01bf6d22a2bcb05ba0de70dc1';

    // If this test is failing, then it is likely a change has been made that requires a DB version bump,
    // and the values above will need updating as confirmation
    it('should not change without fixing this test', function () {
        const routesPath = path.join(config.get('paths').defaultRouteSettings, 'default-routes.yaml');
        const defaultRoutesSource = fs.readFileSync(routesPath, 'utf-8');
        // `yamlSource` is the verbatim file text, so hashing it would trip this
        // canary on comment and whitespace edits that change no route at all.
        // The bridge output this used to hash carried no such field either.
        const defaultRoutes = _.omit(parseRouteSettings(parseYaml(defaultRoutesSource), defaultRoutesSource), 'yamlSource');

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

        assert.equal(schemaHash, currentSchemaHash, 'Database schema has changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        assert.equal(fixturesHash, currentFixturesHash, 'Fixtures have changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        assert.equal(settingsHash, currentSettingsHash, 'Default settings have changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
        assert.equal(routesHash, currentRoutesHash, 'Default routes have changed, please ensure a proper migration has been created if necessary and update the hash in this test.');
    });
});
