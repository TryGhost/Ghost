var utils;

utils = {
    /**
     * Timespans in seconds and milliseconds for better readability
     */
    /* eslint-disable key-spacing */
    ONE_HOUR_S: 3600,
    ONE_DAY_S: 86400,
    ONE_MONTH_S: 2628000,
    SIX_MONTH_S: 15768000,
    ONE_YEAR_S: 31536000,
    FIVE_MINUTES_MS: 300000,
    ONE_HOUR_MS: 3600000,
    ONE_DAY_MS: 86400000,
    ONE_WEEK_MS: 604800000,
    ONE_MONTH_MS: 2628000000,
    SIX_MONTH_MS: 15768000000,
    ONE_YEAR_MS: 31536000000,
    // eslint-enable key-spacing */

    readCSV: require('./read-csv'),
    zipFolder: require('./zip-folder'),
    ghostVersion: require('./ghost-version')
};

module.exports = utils;
