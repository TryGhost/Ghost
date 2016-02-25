/*globals describe, it, afterEach*/
var should          = require('should'),
    sinon           = require('sinon'),
    _               = require('lodash'),
    crypto          = require('crypto'),

    // Stuff we are testing
    schema          = require('../../server/data/schema'),
    fixtures        = require('../../server/data/migration/fixtures'),
    defaultSettings = schema.defaultSettings,

    sandbox = sinon.sandbox.create();

// To stop jshint complaining
should.equal(true, true);

describe('Migrations', function () {
    afterEach(function () {
        sandbox.restore();
    });

    // Check version integrity
    // These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
    // without knowing that they also need to update the default database version,
    // both of which are required for migrations to work properly.
    describe('DB version integrity', function () {
        // Only these variables should need updating
        var currentDbVersion = '004',
            currentSchemaHash = 'a195562bf4915e3f3f610f6d178aba01',
            currentFixturesHash = '17d6aa36a6ba904adca90279eb929381';

        // If this test is failing, then it is likely a change has been made that requires a DB version bump,
        // and the values above will need updating as confirmation
        it('should not change without fixing this test', function () {
            var tablesNoValidation = _.cloneDeep(schema.tables),
                schemaHash,
                fixturesHash;

            _.each(tablesNoValidation, function (table) {
                return _.each(table, function (column, name) {
                    table[name] = _.omit(column, 'validations');
                });
            });

            schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation)).digest('hex');
            fixturesHash = crypto.createHash('md5').update(JSON.stringify(fixtures.fixtures)).digest('hex');

            // Test!
            defaultSettings.core.databaseVersion.defaultValue.should.eql(currentDbVersion);
            schemaHash.should.eql(currentSchemaHash);
            fixturesHash.should.eql(currentFixturesHash);
            schema.versioning.canMigrateFromVersion.should.eql('003');
        });
    });

    describe('Builder', function () {});
});
