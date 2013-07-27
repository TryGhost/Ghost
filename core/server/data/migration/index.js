
var _ = require('underscore'),
    when = require('when'),
    series = require('when/sequence'),
    errors = require('../../errorHandling'),
    knex = require('../../models/base').Knex,
    initialVersion = "001",
    // This currentVersion string should always be the current version of Ghost,
    // we could probably load it from the config file.
    currentVersion = "002";

module.exports = {
    // Check for whether data is needed to be bootstrapped or not
    init: function () {
        var that = this;

        return knex.Schema.hasTable('settings').then(function () {
            // Check for the current version from the settings table
            return knex('settings')
                .where('key', 'currentVersion')
                .select('value')
                .then(function (currentVersionSetting) {
                    // We are assuming here that the currentVersionSetting will 
                    // always be less than the currentVersion value.
                    if (currentVersionSetting === currentVersion) {
                        return when.resolve();
                    }

                    // Bring the data up to the latest version
                    return that.migrateFromVersion(currentVersion);
                }, errors.logAndThrowError);

        }, function () {
            // If the settings table doesn't exist, bring everything up from initial version.
            return that.migrateFromVersion(initialVersion);
        });
    },

    // Migrate from a specific version to the latest
    migrateFromVersion: function (version) {
        var versions = [],
            maxVersion = this.getVersionAfter(currentVersion),
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
    }
};