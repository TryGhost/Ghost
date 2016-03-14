// # Update Database
// Handles migrating a database between two different database versions
var _          = require('lodash'),
    backup     = require('./backup'),
    fixtures   = require('./fixtures'),
    sequence   = require('../../utils/sequence'),
    versioning = require('../schema').versioning,

    updateDatabaseSchema,

    // Public
    update;

/**
 * ### Update Database Schema
 * Fetch the update tasks for each version, and iterate through them in order
 *
 * @param {Array} versions
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
updateDatabaseSchema = function updateDatabaseSchema(versions, logInfo) {
    var migrateOps = versions.reduce(function updateToVersion(migrateOps, version) {
        var tasks = versioning.getUpdateDatabaseTasks(version, logInfo);

        if (tasks && tasks.length > 0) {
            migrateOps.push(function runVersionTasks() {
                logInfo('Updating database to ', version);
                return sequence(tasks, logInfo);
            });
        }

        return migrateOps;
    }, []);

    // execute the commands in sequence
    if (!_.isEmpty(migrateOps)) {
        logInfo('Running migrations');
    }

    return sequence(migrateOps, logInfo);
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

    fromVersion = process.env.FORCE_MIGRATION ? versioning.canMigrateFromVersion : fromVersion;

    // Figure out which versions we're updating through.
    // This shouldn't include the from/current version (which we're already on)
    var versionsToUpdate = versioning.getMigrationVersions(fromVersion, toVersion).slice(1);

    return backup(logInfo).then(function () {
        return updateDatabaseSchema(versionsToUpdate, logInfo);
    }).then(function () {
        // Ensure all of the current default settings are created (these are fixtures, so should be inserted first)
        return fixtures.ensureDefaultSettings(logInfo);
    }).then(function () {
        // Next, run any updates to the fixtures, including default settings, that are required
        return fixtures.update(versionsToUpdate, logInfo);
    }).then(function () {
        // Finally update the database's current version
        return versioning.setDatabaseVersion();
    });
};

module.exports = update;
