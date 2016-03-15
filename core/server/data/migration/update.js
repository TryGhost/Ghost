// # Update Database
// Handles migrating a database between two different database versions
var _          = require('lodash'),
    Promise    = require('bluebird'),
    backup     = require('./backup'),
    builder    = require('./builder'),
    commands   = require('../schema').commands,
    fixtures   = require('./fixtures'),
    schema     = require('../schema').tables,
    sequence   = require('../../utils/sequence'),
    versioning = require('../schema').versioning,

    schemaTables = Object.keys(schema),

    updateDatabaseSchema,
    update;

/**
 * ### Update Database Schema
 * Automatically detect differences between the current DB and the schema, and fix them
 * TODO refactor to use explicit instructions, as this has the potential to destroy data
 *
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
updateDatabaseSchema = function updateDatabaseSchema(logInfo) {
    var oldTables,
        modifyUniCommands = [],
        migrateOps = [];

    return commands.getTables().then(function (tables) {
        oldTables = tables;
        if (!_.isEmpty(oldTables)) {
            return commands.checkTables();
        }
    }).then(function () {
        migrateOps = migrateOps.concat(builder.getDeleteCommands(oldTables, schemaTables));
        migrateOps = migrateOps.concat(builder.getAddCommands(oldTables, schemaTables));
        return Promise.all(
            _.map(oldTables, function (table) {
                return commands.getIndexes(table).then(function (indexes) {
                    modifyUniCommands = modifyUniCommands.concat(builder.modifyUniqueCommands(table, indexes));
                });
            })
        );
    }).then(function () {
        return Promise.all(
            _.map(oldTables, function (table) {
                return commands.getColumns(table).then(function (columns) {
                    migrateOps = migrateOps.concat(builder.dropColumnCommands(table, columns));
                    migrateOps = migrateOps.concat(builder.addColumnCommands(table, columns));
                });
            })
        );
    }).then(function () {
        migrateOps = migrateOps.concat(_.compact(modifyUniCommands));

        // execute the commands in sequence
        if (!_.isEmpty(migrateOps)) {
            logInfo('Running migrations');

            return sequence(migrateOps);
        }
    });
};

/**
 * ## Update
 * Does a backup, then updates the database and fixtures
 *
 * @param {String} fromVersion
 * @param {String} toVersion
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
update = function update(fromVersion, toVersion, logInfo) {
    // Is the current version lower than the version we can migrate from?
    // E.g. is this blog's DB older than 003?
    if (fromVersion < versioning.canMigrateFromVersion) {
        return versioning.showCannotMigrateError();
    }

    return backup(logInfo).then(function () {
        return updateDatabaseSchema(logInfo);
    }).then(function () {
        // Ensure all of the current default settings are created (these are fixtures, so should be inserted first)
        return fixtures.ensureDefaultSettings(logInfo);
    }).then(function () {
        fromVersion = process.env.FORCE_MIGRATION ? versioning.canMigrateFromVersion : fromVersion;
        var versions = versioning.getMigrationVersions(fromVersion, toVersion);
        // Finally, run any updates to the fixtures, including default settings, that are required
        // for anything other than the from/current version (which we're already on)
        return fixtures.update(versions.slice(1), logInfo);
    }).then(function () {
        // Finally update the databases current version
        return versioning.setDatabaseVersion();
    });
};

module.exports = update;
