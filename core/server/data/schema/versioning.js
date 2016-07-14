var path            = require('path'),
    db              = require('../db'),
    errors          = require('../../errors'),
    i18n            = require('../../i18n'),
    defaultSettings = require('./default-settings'),

    defaultDatabaseVersion;

// Default Database Version
// The migration version number according to the hardcoded default settings
// This is the version the database should be at or migrated to
function getDefaultDatabaseVersion() {
    if (!defaultDatabaseVersion) {
        // This be the current version according to the software
        defaultDatabaseVersion = defaultSettings.core.databaseVersion.defaultValue;
    }

    return defaultDatabaseVersion;
}

// Database Current Version
// The migration version number according to the database
// This is what the database is currently at and may need to be updated
function getDatabaseVersion() {
    return db.knex.schema.hasTable('settings').then(function (exists) {
        // Check for the current version from the settings table
        if (exists) {
            // Temporary code to deal with old databases with currentVersion settings
            return db.knex('settings')
                .where('key', 'databaseVersion')
                .first('value')
                .then(function (version) {
                    if (!version || isNaN(version.value)) {
                        return errors.rejectError(new Error(
                            i18n.t('errors.data.versioning.index.dbVersionNotRecognized')
                        ));
                    }

                    return version.value;
                });
        }
        return errors.rejectError(new Error(
            i18n.t('errors.data.versioning.index.settingsTableDoesNotExist')
        ));
    });
}

function setDatabaseVersion(transaction, version) {
    return (transaction || db.knex)('settings')
        .where('key', 'databaseVersion')
        .update({value: version || defaultDatabaseVersion});
}

function pad(num, width) {
    return Array(Math.max(width - String(num).length + 1, 0)).join(0) + num;
}

function getMigrationVersions(fromVersion, toVersion) {
    var versions = [],
        i;

    for (i = parseInt(fromVersion, 10); i <= toVersion; i += 1) {
        versions.push(pad(i, 3));
    }

    return versions;
}

function showCannotMigrateError() {
    return errors.logAndRejectError(
        i18n.t('errors.data.versioning.index.cannotMigrate.error'),
        i18n.t('errors.data.versioning.index.cannotMigrate.context'),
        i18n.t('common.seeLinkForInstructions', {link: 'http://support.ghost.org/how-to-upgrade/'})
    );
}

/**
 * ### Get Version Tasks
 * Tries to require a directory matching the version number
 *
 * This was split from update to make testing easier
 *
 * @param {String} version
 * @param {String} relPath
 * @param {Function} logger
 * @returns {Array}
 */
function getVersionTasks(version, relPath, logger) {
    var tasks = [];

    try {
        tasks = require(path.join(relPath, version));
    } catch (e) {
        logger.info('No tasks found for version', version);
    }

    return tasks;
}

function getUpdateDatabaseTasks(version, logger) {
    return getVersionTasks(version, '../migration/', logger);
}

function getUpdateFixturesTasks(version, logger) {
    return getVersionTasks(version, '../migration/fixtures/', logger);
}

module.exports = {
    canMigrateFromVersion: '003',
    showCannotMigrateError: showCannotMigrateError,
    getDefaultDatabaseVersion: getDefaultDatabaseVersion,
    getDatabaseVersion: getDatabaseVersion,
    setDatabaseVersion: setDatabaseVersion,
    getMigrationVersions: getMigrationVersions,
    getUpdateDatabaseTasks: getUpdateDatabaseTasks,
    getUpdateFixturesTasks: getUpdateFixturesTasks
};
