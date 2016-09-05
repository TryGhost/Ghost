var config = require('../../../../config'),
    models = require(config.paths.corePath + '/server/models'),
    transfomDatesIntoUTC = require(config.paths.corePath + '/server/data/migration/fixtures/006/01-transform-dates-into-utc'),
    Promise = require('bluebird'),
    messagePrefix = 'Fix sqlite format: ',
    _private = {};

_private.getTZOffsetMax = function getTZOffsetMax() {
    return Math.max(Math.abs(new Date('2015-07-01').getTimezoneOffset()), Math.abs(new Date('2015-01-01').getTimezoneOffset()));
};

/**
 * this migration script is a very special one for people who run their server in UTC and use sqlite3 or run their server in any TZ and use postgres
 * 006/01-transform-dates-into-utc had a bug for this case, see what happen because this bug https://github.com/TryGhost/Ghost/issues/7192
 */
module.exports = function fixSqliteFormat(options, logger) {
    var ServerTimezoneOffset = _private.getTZOffsetMax(),
        settingsMigrations, settingsKey = '006/01';

    // CASE: skip this script when using mysql
    if (config.database.client === 'mysql') {
        logger.warn(messagePrefix + 'This script only runs, when using sqlite/postgres as database.');
        return Promise.resolve();
    }

    // CASE: skip this script if using sqlite, but server is not UTC
    if (ServerTimezoneOffset !== 0 && config.database.client === 'sqlite3') {
        logger.warn(messagePrefix + 'This script only runs, when your server runs in UTC and you are using sqlite.');
        return Promise.resolve();
    }

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
