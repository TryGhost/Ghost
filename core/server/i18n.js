/* global Intl */

var supportedLocales    = ['en'],
    _                   = require('lodash'),
    fs                  = require('fs'),
    chalk               = require('chalk'),
    MessageFormat       = require('intl-messageformat'),
    errors              = require('./errors'),

    // TODO: fetch this dynamically based on overall blog settings (`key = "defaultLang"` in the `settings` table
    currentLocale       = 'en',
    blos,
    I18n;

I18n = {

    /**
     * Helper method to find and compile the given data context with a proper string resource.
     *
     * @param {string} path Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @param {json} context
     * @returns {string}
     */
    t: function t(path, context) {
        var string = I18n.findString(path),
            msg;

        // If the path returns an array (as in the case with anything that has multiple paragraphs such as emails), then
        // loop through them and return an array of translated/formatted strings. Otherwise, just return the normal
        // translated/formatted string.
        if (_.isArray(string)) {
            msg = [];
            string.forEach(function (s) {
                var m = new MessageFormat(s, currentLocale);

                msg.push(m.format(context));
            });
        } else {
            msg = new MessageFormat(string, currentLocale);
            msg = msg.format(context);
        }

        return msg;
    },

    /**
     * Parse JSON file for matching locale, returns string giving path.
     *
     * @param {string} msgPath Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @returns {string}
     */
    findString: function findString(msgPath) {
        var matchingString, path;

        // no path? no string
        if (_.isEmpty(msgPath) || !_.isString(msgPath)) {
            chalk.yellow('i18n:t() - received an empty path.');
            return '';
        }

        matchingString = blos;

        path = msgPath.split('.');
        path.forEach(function (key) {
            // reassign matching object, or set to an empty string if there is no match
            matchingString = matchingString[key] || null;
        });

        if (_.isNull(matchingString)) {
            errors.logError('Unable to find matching path [' + msgPath + '] in locale file.');
            matchingString = 'i18n error: path "' + msgPath + '" was not found.';
        }

        return matchingString;
    },

    /**
     * Setup i18n support:
     *  - Load proper language file in to memory
     *  - Polyfill node.js if it does not have Intl support or support for a particular locale
     */
    init: function init() {
        // read file for current locale and keep its content in memory
        blos = fs.readFileSync(__dirname + '/translations/' + currentLocale + '.json');
        blos = JSON.parse(blos);

        if (global.Intl) {
            // Determine if the built-in `Intl` has the locale data we need.
            var hasBuiltInLocaleData,
                IntlPolyfill;

            hasBuiltInLocaleData = supportedLocales.every(function (locale) {
                return Intl.NumberFormat.supportedLocalesOf(locale)[0] === locale &&
                    Intl.DateTimeFormat.supportedLocalesOf(locale)[0] === locale;
            });

            if (!hasBuiltInLocaleData) {
                // `Intl` exists, but it doesn't have the data we need, so load the
                // polyfill and replace the constructors with need with the polyfill's.
                IntlPolyfill = require('intl');
                Intl.NumberFormat   = IntlPolyfill.NumberFormat;
                Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
            }
        } else {
            // No `Intl`, so use and load the polyfill.
            global.Intl = require('intl');
        }
    }
};

module.exports = I18n;
