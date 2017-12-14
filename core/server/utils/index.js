var utils,
    getRandomInt;

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */
getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

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

    /**
     * Return a unique identifier with the given `len`.
     *
     *     utils.uid(10);
     *     // => "FDaS435D2z"
     *
     * @param {Number} len
     * @return {String}
     * @api private
     */
    uid: function (len) {
        var buf = [],
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            charlen = chars.length,
            i;

        for (i = 0; i < len; i = i + 1) {
            buf.push(chars[getRandomInt(0, charlen - 1)]);
        }

        return buf.join('');
    },

    readCSV: require('./read-csv'),
    zipFolder: require('./zip-folder'),
    ghostVersion: require('./ghost-version')
};

module.exports = utils;
