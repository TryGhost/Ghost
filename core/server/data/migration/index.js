
var _ = require('underscore'),
    when = require('when'),
    series = require('when/sequence'),
    errors = require('../../errorHandling'),
    knex = require('../../models/base').Knex,

    defaultSettings = require('../default-settings'),
    Settings = require('../../models/settings').Settings,
    fixtures = require('../fixtures'),

    initialVersion = '000',
    defaultDatabaseVersion;

// Default Database Version
// The migration version number according to the hardcoded default settings
// This is the version the database should be at or migrated to
function getDefaultDatabaseVersion() {
    if (!defaultDatabaseVersion) {
        // This be the current version according to the software
        defaultDatabaseVersion = _.find(defaultSettings.core, function (setting) {
            return setting.key === 'databaseVersion';
        }).defaultValue;
    }

    return defaultDatabaseVersion;
}

// Database Current Version
// The migration version number according to the database
// This is what the database is currently at and may need to be updated
function getDatabaseVersion() {
    return knex.Schema.hasTable('settings').then(function (exists) {
        // Check for the current version from the settings table
        if (exists) {
            // Temporary code to deal with old databases with currentVersion settings
            return knex('settings')
                .where('key', 'databaseVersion')
                .orWhere('key', 'currentVersion')
                .select('value')
                .then(function (versions) {
                    var databaseVersion = _.reduce(versions, function (memo, version) {
                        if (isNaN(version.value)) {
                            errors.throwError('Database version is not recognised');
                        }
                        return parseInt(version.value, 10) > parseInt(memo, 10) ? version.value : memo;
                    }, initialVersion);

                    if (!databaseVersion || databaseVersion.length === 0) {
                        // we didn't get a response we understood, assume initialVersion
                        databaseVersion = initialVersion;
                    }

                    return databaseVersion;
                });
        }
        return when.reject('Settings table does not exist');
    });
}

function setDatabaseVersion() {
    return knex('settings')
        .where('key', 'databaseVersion')
        .update({ 'value': defaultDatabaseVersion });
}


module.exports = {
    getDatabaseVersion: getDatabaseVersion,
    // Check for whether data is needed to be bootstrapped or not
    init: function () {
        var self = this;

        // There are 4 possibilities:
        // 1. The database exists and is up-to-date
        // 2. The database exists but is out of date
        // 3. The database exists but the currentVersion setting does not or cannot be understood
        // 4. The database has not yet been created
        return getDatabaseVersion().then(function (databaseVersion) {
            var defaultVersion = getDefaultDatabaseVersion();

            if (databaseVersion === defaultVersion) {
                // 1. The database exists and is up-to-date
                return when.resolve();
            }

            if (databaseVersion < defaultVersion) {
                // 2. The database exists but is out of date
                return self.migrateUpFromVersion(databaseVersion);
            }

            if (databaseVersion > defaultVersion) {
                // 3. The database exists but the currentVersion setting does not or cannot be understood
                // In this case we don't understand the version because it is too high
                errors.logErrorAndExit(
                    'Your database is not compatible with this version of Ghost',
                    'You will need to create a new database'
                );
            }

        }, function (err) {
            if (err === 'Settings table does not exist') {
                // 4. The database has not yet been created
                // Bring everything up from initial version.
                return self.migrateUpFreshDb();
            }

            // 3. The database exists but the currentVersion setting does not or cannot be understood
            // In this case the setting was missing or there was some other problem
            errors.logErrorAndExit('There is a problem with the database', err.message || err);
        });
    },

    // ### Reset
    // Migrate from where we are down to nothing.
    reset: function () {
        var self = this;

        return getDatabaseVersion().then(function (databaseVersion) {
            // bring everything down from the current version
            return self.migrateDownFromVersion(databaseVersion);
        }, function () {
            // If the settings table doesn't exist, bring everything down from initial version.
            return self.migrateDownFromVersion(initialVersion);
        });
    },

    // Only do this if we have no database at all
    migrateUpFreshDb: function () {
        var migration = require('./' + initialVersion);

        return migration.up().then(function () {
            // Load the fixtures
            return fixtures.populateFixtures();

        }).then(function () {
            // Initialise the default settings
            return Settings.populateDefaults();
        });
    },

    // Migrate from a specific version to the latest
    migrateUpFromVersion: function (version, max) {
        var versions = [],
            maxVersion = max || this.getVersionAfter(getDefaultDatabaseVersion()),
            currVersion = version,
            tasks = [];

        // Aggregate all the versions we need to do migrations for
        while (currVersion !== maxVersion) {
            versions.push(currVersion);
            currVersion = this.getVersionAfter(currVersion);
        }

        // Aggregate all the individual up calls to use in the series(...) below
        tasks = _.map(versions, function (taskVersion) {
            return function () {
                try {
                    var migration = require('./' + taskVersion);
                    return migration.up();
                } catch (e) {
                    errors.logError(e);
                    return when.reject(e);
                }
            };
        });

        // Run each migration in series
        return series(tasks).then(function () {
            // Finally update the databases current version
            return setDatabaseVersion();
        });
    },

    migrateDownFromVersion: function (version) {
        var self = this,
            versions = [],
            minVersion = this.getVersionBefore(initialVersion),
            currVersion = version,
            tasks = [];

        // Aggregate all the versions we need to do migrations for
        while (currVersion !== minVersion) {
            versions.push(currVersion);
            currVersion = this.getVersionBefore(currVersion);
        }

        // Aggregate all the individual up calls to use in the series(...) below
        tasks = _.map(versions, function (taskVersion) {
            return function () {
                try {
                    var migration = require('./' + taskVersion);
                    return migration.down();
                } catch (e) {
                    errors.logError(e);
                    return self.migrateDownFromVersion(initialVersion);
                }
            };
        });

        // Run each migration in series
        return series(tasks);
    },

    // Get the following version based on the current
    getVersionAfter: function (currVersion) {

        var currVersionNum = parseInt(currVersion, 10),
            nextVersion;

        // Default to initialVersion if not parsed
        if (isNaN(currVersionNum)) {
            currVersionNum = parseInt(initialVersion, 10);
        }

        currVersionNum += 1;

        nextVersion = String(currVersionNum);
        // Pad with 0's until 3 digits
        while (nextVersion.length < 3) {
            nextVersion = "0" + nextVersion;
        }

        return nextVersion;
    },

    getVersionBefore: function (currVersion) {
        var currVersionNum = parseInt(currVersion, 10),
            prevVersion;

        if (isNaN(currVersionNum)) {
            currVersionNum = parseInt(initialVersion, 10);
        }

        currVersionNum -= 1;

        prevVersion = String(currVersionNum);
               // Pad with 0's until 3 digits
        while (prevVersion.length < 3) {
            prevVersion = "0" + prevVersion;
        }

        return prevVersion;
    }
};