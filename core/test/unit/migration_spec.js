/*globals describe, it*/
/*jshint expr:true*/
var should          = require('should'),
    _               = require('lodash'),
    crypto          = require('crypto'),
    rewire          = require('rewire'),

    // Stuff we are testing
    defaultSettings = require('../../server/data/default-settings'),
    schema          = require('../../server/data/schema'),
    // Use 'rewire' to force a clean load.  Otherwise execution of addAllPermissions by other tests can cause
    //    'object_type' keys to be in the hash when we check it, which the expected md5 values don't include.
    permissions     = rewire('../../server/data/fixtures/permissions/permissions');

// To stop jshint complaining
should.equal(true, true);

describe('Migrations', function () {
    // These tests exist to ensure that developers are not able to modify the database schema, or permissions fixtures
    // without knowing that they also need to update the default database version,
    // both of which are required for migrations to work properly.

    describe('DB version integrity', function () {
        // Only these variables should need updating
        var currentDbVersion = '003',
            currentSchemaHash = '4f2a9e139f4c3dcf04e3006ea8ebba97',
            currentPermissionsHash = '42e486732270cda623fc5efc04808c0c';

        // If this test is failing, then it is likely a change has been made that requires a DB version bump,
        // and the values above will need updating as confirmation
        it('should not change without fixing this test', function () {
            var tablesNoValidation = _.cloneDeep(schema.tables),
                schemaHash,
                permissionsHash;

            _.each(tablesNoValidation, function (table) {
                return _.each(table, function (column, name) {
                    table[name] = _.omit(column, 'validations');
                });
            });

            schemaHash = crypto.createHash('md5').update(JSON.stringify(tablesNoValidation)).digest('hex');
            permissionsHash = crypto.createHash('md5').update(JSON.stringify(permissions)).digest('hex');

            // Test!
            defaultSettings.core.databaseVersion.defaultValue.should.eql(currentDbVersion);
            schemaHash.should.eql(currentSchemaHash);
            permissionsHash.should.eql(currentPermissionsHash);
        });
    });
});
