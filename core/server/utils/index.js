var unidecode  = require('unidecode'),

    utils,
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
    ONE_HOUR_S:          3600,
    ONE_DAY_S:          86400,
    ONE_YEAR_S:      31536000,
    ONE_HOUR_MS:      3600000,
    ONE_DAY_MS:      86400000,
    ONE_WEEK_MS:    604800000,
    ONE_MONTH_MS:  2628000000,
    ONE_YEAR_MS:  31536000000,

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

        for (i = 1; i < len; i = i + 1) {
            buf.push(chars[getRandomInt(0, charlen - 1)]);
        }

        return buf.join('');
    },
    safeString: function (string) {
        // Handle the £ symbol seperately, since it needs to be removed before
        // the unicode conversion.
        string = string.replace(/£/g, '-');

        // Remove non ascii characters
        string = unidecode(string);

        // Replace URL reserved chars: `:/?#[]!$&()*+,;=` as well as `\%<>|^~£"`
        string = string.replace(/(\s|\.|@|:|\/|\?|#|\[|\]|!|\$|&|\(|\)|\*|\+|,|;|=|\\|%|<|>|\||\^|~|"|–|—)/g, '-')
            // Remove apostrophes
            .replace(/'/g, '')
            // Convert 2 or more dashes into a single dash
            .replace(/-+/g, '-')
            // Remove any dashes at the beginning
            .replace(/^-/, '')
            // Make the whole thing lowercase
            .toLowerCase();

        // Remove trailing dash if needed
        string = string.charAt(string.length - 1) === '-' ? string.substr(0, string.length - 1) : string;

        // Handle whitespace at the beginning or end.
        string = string.trim();

        return string;
    },
    // The token is encoded URL safe by replacing '+' with '-', '\' with '_' and removing '='
    // NOTE: the token is not encoded using valid base64 anymore
    encodeBase64URLsafe: function (base64String) {
        return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    // Decode url safe base64 encoding and add padding ('=')
    decodeBase64URLsafe: function (base64String) {
        base64String = base64String.replace(/-/g, '+').replace(/_/g, '/');
        while (base64String.length % 4) {
            base64String += '=';
        }
        return base64String;
    }
};

module.exports = utils;
