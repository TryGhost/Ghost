var config = require('../../../../config'),
    _ = require('lodash'),
    models = require(config.get('paths').corePath + '/server/models'),
    transfomDatesIntoUTC = require(config.get('paths').corePath + '/server/data/migration/fixtures/006/01-transform-dates-into-utc'),
    Promise = require('bluebird'),
    messagePrefix = 'Fix sqlite format: ',
    _private = {};

_private.rerunDateMigration = function rerunDateMigration(options, logger) {
    var settingsMigrations, settingsKey = '006/01';

    return models.Settings.findOne({key: 'migrations'}, options)
        .then(function removeMigrationSettings(result) {
            try {
                settingsMigrations = JSON.parse(result.attributes.value) || {};
            } catch (err) {
                return Promise.reject(err);
            }

            // CASE: migration ran already
            if (settingsMigrations.hasOwnProperty(settingsKey)) {
                delete settingsMigrations[settingsKey];

                return models.Settings.edit({
                    key: 'migrations',
                    value: JSON.stringify(settingsMigrations)
                }, options);
            }
        })
        .then(function () {
            return transfomDatesIntoUTC(options, logger);
        });
};

/**
 * this migration script is a very special one for people who run their server in UTC and use sqlite3
 * 006/01-transform-dates-into-utc had a bug for this case, see what happen because of this bug https://github.com/TryGhost/Ghost/issues/7192
 */
module.exports = function fixSqliteFormat(options, logger) {
    // CASE: skip this script when using mysql
    if (config.get('database').client === 'mysql') {
        logger.warn(messagePrefix + 'This script only runs, when using sqlite as database.');
        return Promise.resolve();
    }

    // CASE: sqlite3 and server is UTC, we check if the date migration was already running
    return options.transacting.raw('select created_at from users')
        .then(function (users) {
            // safety measure
            if (!users || !users.length) {
                return;
            }

            // CASE: if type is string and sqlite, then it already has the correct date format
            if (!_.isNumber(users[0].created_at)) {
                logger.warn(messagePrefix + 'Your dates are in correct format.');
                return;
            }

            return _private.rerunDateMigration(options, logger);
        });
};
