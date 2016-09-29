var path            = require('path'),
    Promise         = require('bluebird'),
    db              = require('../db'),
    errors          = require('../../errors'),
    i18n            = require('../../i18n'),
    defaultSettings = require('./default-settings'),

    defaultDatabaseVersion;

// Newest Database Version
// The migration version number according to the hardcoded default settings
// This is the version the database should be at or migrated to
function getNewestDatabaseVersion() {
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
                        return Promise.reject(new errors.DatabaseVersion(i18n.t('errors.data.versioning.index.dbVersionNotRecognized')));
                    }

                    return version.value;
                });
        }

        return Promise.reject(new errors.DatabaseNotPopulated(i18n.t('errors.data.versioning.index.databaseNotPopulated')));
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

/**
 * ### Get Version Tasks
 * Tries to require a directory matching the version number
 *
 * This was split from update to make testing easier
 *
 * @param {String} version
 * @param {String} relPath
 * @returns {Array}
 */
function getVersionTasks(version, relPath) {
    var tasks = [];

    try {
        tasks = require(path.join(relPath, version));
    } catch (e) {
        // ignore
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
    getNewestDatabaseVersion: getNewestDatabaseVersion,
    getDatabaseVersion: getDatabaseVersion,
    setDatabaseVersion: setDatabaseVersion,
    getMigrationVersions: getMigrationVersions,
    getUpdateDatabaseTasks: getUpdateDatabaseTasks,
    getUpdateFixturesTasks: getUpdateFixturesTasks
};
