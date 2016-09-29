var config = require('../../../../config'),
    models = require(config.paths.corePath + '/server/models'),
    transfomDatesIntoUTC = require(config.paths.corePath + '/server/data/migration/fixtures/006/01-transform-dates-into-utc'),
    Promise = require('bluebird'),
    messagePrefix = 'Fix sqlite/pg format: ';

/**
 * this migration script is a very special one for people who run their server in UTC and use sqlite3 or run their server in any TZ and use postgres
 * 006/01-transform-dates-into-utc had a bug for this case, see what happen because of this bug https://github.com/TryGhost/Ghost/issues/7192
 */
module.exports = function fixSqliteFormat(options, logger) {
    var settingsMigrations, settingsKey = '006/01';

    // CASE: skip this script when using mysql
    if (config.database.client === 'mysql') {
        logger.warn(messagePrefix + 'This script only runs, when using sqlite/postgres as database.');
        return Promise.resolve();
    }

    // CASE: sqlite3 and postgres need's to re-run 006 date migrations
    //       because we had a bug that both database types were skipped when their server was running in UTC
    //       but we need to change the date format in that case as well, but without offset!
    return models.Settings.findOne({key: 'migrations'}, options)
        .then(function fetchedMigrationsSettings(result) {
            try {
                settingsMigrations = JSON.parse(result.attributes.value) || {};
            } catch (err) {
                return Promise.reject(err);
            }

            if (settingsMigrations.hasOwnProperty(settingsKey)) {
                logger.warn(messagePrefix + 'Your dates are in correct format.');
                return;
            }

            return transfomDatesIntoUTC(options, logger);
        });
};
