
var _ = require('underscore'),
    when = require('when'),
    series = require('when/sequence'),
    errors = require('../../errorHandling'),
    knex = require('../../models/base').Knex,
    initialVersion = '000',
    // This currentVersion string should always be the current version of Ghost,
    // we could probably load it from the config file.
    // - Will be possible after default-settings.json restructure
    currentVersion = '000';

function getCurrentVersion() {
    return knex.Schema.hasTable('settings').then(function () {
        // Check for the current version from the settings table
        return knex('settings')
            .where('key', 'currentVersion')
            .select('value')
            .then(function (currentVersionSetting) {
                if (currentVersionSetting && currentVersionSetting.length > 0) {
                    currentVersionSetting = currentVersionSetting[0].value;
                } else {
                    // we didn't get a response we understood, assume initialVersion
                    currentVersionSetting = initialVersion;
                }
                return currentVersionSetting;
            });
    });
}


module.exports = {
    currentVersion: currentVersion,
    // Check for whether data is needed to be bootstrapped or not
    init: function () {
        var self = this;

        return getCurrentVersion().then(function (currentVersionSetting) {
            // We are assuming here that the currentVersionSetting will
            // always be less than the currentVersion value.
            if (currentVersionSetting === currentVersion) {
                return when.resolve();
            }

            // Bring the data up to the latest version
            return self.migrateUpFromVersion(currentVersion);
        }, function () {
            // If the settings table doesn't exist, bring everything up from initial version.
            return self.migrateUpFromVersion(initialVersion);
        });
    },

    // ### Reset
    // Migrate from where we are down to nothing.
    reset: function () {
        var self = this;

        return getCurrentVersion().then(function (currentVersionSetting) {
            // bring everything down from the current version
            return self.migrateDownFromVersion(currentVersionSetting);
        }, function () {
            // If the settings table doesn't exist, bring everything down from initial version.
            return self.migrateDownFromVersion(initialVersion);
        });
    },

    // Migrate from a specific version to the latest
    migrateUpFromVersion: function (version, max) {
        var versions = [],
            maxVersion = max || this.getVersionAfter(currentVersion),
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
        return series(tasks);
    },

    migrateDownFromVersion: function (version) {
        console.log('version', version);
        var versions = [],
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
                    return when.reject(e);
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