const should = require('should');
const _ = require('lodash');
const crypto = require('crypto');
const schema = require('../../../../core/server/data/schema');
const fixtures = require('../../../../core/server/data/schema/fixtures');

/**
 * @NOTE
 *
 * If this test fails for you, you have modified the database schema or fixtures.
 * When you make a change, please test that:
 *
 * 1. A new blog get's installed and the database looks correct and complete.
 * 2. A blog get's updated from a lower Ghost version and the database looks correct and complete.
 *
 * Typical cases:
 * You have to add a migration script if you've added/modified permissions.
 * You have to add a migration script if you've add a new table.
 */
describe('DB version integrity', function () {
    // Only these variables should need updating
    const currentSchemaHash = '74b599e66e9d28c591cb7a3d9ec528cf';
    const currentFixturesHash = '94cf7dfe95e88022b3515c9664af2e66';

    // If this test is failing, then it is likely a change has been made that requires a DB version bump,
    // and the values above will need updating as confirmation
    it('should not change without fixing this test', function () {
        const tablesNoValidation = _.cloneDeep(schema.tables);
        let schemaHash;
        let fixturesHash;

        _.each(tablesNoValidation, function (table) {
            return _.each(table, function (column, name) {
                table[name] = _.omit(column, 'validations');
            });
        });

        schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation), 'binary').digest('hex');
        fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures), 'binary').digest('hex');

        schemaHash.should.eql(currentSchemaHash);
        fixturesHash.should.eql(currentFixturesHash);
    });
});
