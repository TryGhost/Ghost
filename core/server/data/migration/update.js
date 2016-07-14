// # Update Database
// Handles migrating a database between two different database versions
var Promise = require('bluebird'),
    backup = require('./backup'),
    fixtures = require('./fixtures'),
    models = require('../../models'),
    db = require('../../data/db'),
    sequence = require('../../utils/sequence'),
    versioning = require('../schema').versioning,

    updateDatabaseSchema,
    migrateToDatabaseVersion,
    update;

/**
 * update database schema for one single version
 */
updateDatabaseSchema = function (tasks, logger, modelOptions) {
    if (!tasks.length) {
        return Promise.resolve();
    }

    return sequence(tasks, modelOptions, logger);
};

/**
 * update each database version as one transaction
 * if a version fails, rollback
 * if a version fails, stop updating more versions
 */
migrateToDatabaseVersion = function migrateToDatabaseVersion(version, logger, modelOptions) {
    return new Promise(function (resolve, reject) {
        db.knex.transaction(function (transaction) {
            var migrationTasks = versioning.getUpdateDatabaseTasks(version, logger),
                fixturesTasks = versioning.getUpdateFixturesTasks(version, logger);

            logger.info('###########');
            logger.info('Updating database to ' + version);
            logger.info('###########\n');

            modelOptions.transacting = transaction;

            updateDatabaseSchema(migrationTasks, logger, modelOptions)
                .then(function () {
                    return fixtures.update(fixturesTasks, logger, modelOptions);
                })
                .then(function () {
                    return versioning.setDatabaseVersion(transaction, version);
                })
                .then(function () {
                    return models.Settings.populateDefaults(modelOptions);
                })
                .then(function () {
                    transaction.commit();
                    resolve();
                })
                .catch(function (err) {
                    logger.warn('rolling back because of: ' + err.stack);

                    transaction.rollback();
                });
        }).catch(function () {
            reject();
        });
    });
};

/**
 * ## Update
 * Does a backup, then updates the database and fixtures
 *
 * @param {String} fromVersion
 * @param {String} toVersion
 * @param {{info: logger.info, warn: logger.warn}} logger
 * @returns {Promise<*>}
 */
update = function update(fromVersion, toVersion, logger, modelOptions) {
    modelOptions = modelOptions || {};
    // Is the current version lower than the version we can migrate from?
    // E.g. is this blog's DB older than 003?
    if (fromVersion < versioning.canMigrateFromVersion) {
        return versioning.showCannotMigrateError();
    }

    fromVersion = process.env.FORCE_MIGRATION ? versioning.canMigrateFromVersion : fromVersion;

    // Figure out which versions we're updating through.
    // This shouldn't include the from/current version (which we're already on)
    var versionsToUpdate = versioning.getMigrationVersions(fromVersion, toVersion).slice(1);

    return backup(logger)
        .then(function () {
            return Promise.mapSeries(versionsToUpdate, function (versionToUpdate) {
                return migrateToDatabaseVersion(versionToUpdate, logger, modelOptions);
            });
        })
        .catch(function () {
            // we don't want that your blog can't start
            Promise.resolve();
        });
};

module.exports = update;
