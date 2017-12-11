var unidecode = require('unidecode'),
    _ = require('lodash'),
    common = require('../lib/common'),
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

    safeString: function (string, options) {
        options = options || {};

        if (string === null) {
            string = '';
        }

        // Handle the £ symbol separately, since it needs to be removed before the unicode conversion.
        string = string.replace(/£/g, '-');

        // Remove non ascii characters
        string = unidecode(string);

        // Replace URL reserved chars: `@:/?#[]!$&()*+,;=` as well as `\%<>|^~£"{}` and \`
        string = string.replace(/(\s|\.|@|:|\/|\?|#|\[|\]|!|\$|&|\(|\)|\*|\+|,|;|=|\\|%|<|>|\||\^|~|"|\{|\}|`|–|—)/g, '-')
        // Remove apostrophes
            .replace(/'/g, '')
            // Make the whole thing lowercase
            .toLowerCase();

        // We do not need to make the following changes when importing data
        if (!_.has(options, 'importing') || !options.importing) {
            // Convert 2 or more dashes into a single dash
            string = string.replace(/-+/g, '-')
            // Remove trailing dash
                .replace(/-$/, '')
                // Remove any dashes at the beginning
                .replace(/^-/, '');
        }

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
    },

    /**
     * NOTE: No separate utils file, because redirects won't live forever in a JSON file, see V2 of https://github.com/TryGhost/Ghost/issues/7707
     */
    validateRedirects: function validateRedirects(redirects) {
        if (!_.isArray(redirects)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.utils.redirectsWrongFormat'),
                help: 'https://docs.ghost.org/docs/redirects'
            });
        }

        _.each(redirects, function (redirect) {
            if (!redirect.from || !redirect.to) {
                throw new common.errors.ValidationError({
                    message: common.i18n.t('errors.utils.redirectsWrongFormat'),
                    context: JSON.stringify(redirect),
                    help: 'https://docs.ghost.org/docs/redirects'
                });
            }
        });
    },

    readCSV: require('./read-csv'),
    removeOpenRedirectFromUrl: require('./remove-open-redirect-from-url'),
    zipFolder: require('./zip-folder'),
    generateAssetHash: require('./asset-hash'),
    tokens: require('./tokens'),
    sequence: require('./sequence'),
    ghostVersion: require('./ghost-version'),
    mobiledocConverter: require('./mobiledoc-converter'),
    markdownConverter: require('./markdown-converter')
};

module.exports = utils;
