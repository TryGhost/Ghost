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
        string = string.trim();

        // Remove non ascii characters
        string = unidecode(string);

        // Remove URL reserved chars: `:/?#[]@!$&'()*+,;=` as well as `\%<>|^~£"`
        string = string.replace(/[:\/\?#\[\]@!$&'()*+,;=\\%<>\|\^~£"]/g, '')
            // Replace dots and spaces with a dash
            .replace(/(\s|\.)/g, '-')
            // Convert 2 or more dashes into a single dash
            .replace(/-+/g, '-')
            // Make the whole thing lowercase
            .toLowerCase();

        return string;
    }
};

module.exports = utils;