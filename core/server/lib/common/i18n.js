/* global Intl */

var supportedLocales = ['en'],
    _ = require('lodash'),
    fs = require('fs-extra'),
    path = require('path'),
    chalk = require('chalk'),
    MessageFormat = require('intl-messageformat'),
    logging = require('./logging'),
    errors = require('./errors'),
    jp = require('jsonpath'),
    path = require('path'),
    settingsCache = require('./settings/cache'),

    // currentLocale, dynamically based on overall settings (key = "default_locale") in the settings db table
    // (during Ghost's initialization, settings available inside i18n functions below; see core/server/index.js)
    // E.g.: en = English (default), es = Spanish, en-US = American English, etc.
    // The corresponding translation files should be at core/server/translations/en.json, es.json...
    // and content/themes/mytheme/assets/translations/mytheme_en.json, mytheme_en.css...
    currentLocale,
    activeTheme,
    blos,
    I18n;

I18n = {

    /**
     * Helper method to find and compile the given data context with a proper string resource.
     *
     * @param {string} path Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @param {object} [bindings]
     * @returns {string}
     */
    t: function t(path, bindings) {
        var string = I18n.findString(path),
            msg;

        currentLocale = settingsCache.get('default_lang') || 'en';

        // If the path returns an array (as in the case with anything that has multiple paragraphs such as emails), then
        // loop through them and return an array of translated/formatted strings. Otherwise, just return the normal
        // translated/formatted string.
        if (_.isArray(string)) {
            msg = [];
            string.forEach(function (s) {
                var m = new MessageFormat(s, currentLocale);

                try {
                    m.format(bindings);
                } catch (err) {
                    logging.error(err.message);

                    // fallback
                    m = new MessageFormat(blos.errors.errors.anErrorOccurred, currentLocale);
                    m = msg.format();
                }

                msg.push(m);
            });
        } else {
            msg = new MessageFormat(string, currentLocale);

            try {
                msg = msg.format(bindings);
            } catch (err) {
                logging.error(err.message);

                // fallback
                msg = new MessageFormat(blos.errors.errors.anErrorOccurred, currentLocale);
                msg = msg.format();
            }
        }

        return msg;
    },

    /**
     * Parse JSON file for matching locale, returns string giving path.
     *
     * @param {string} msgPath Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @returns {string}
     */
    findString: function findString(msgPath, opts) {
        var options = _.merge({log: true}, opts || {}),
            candidateString, matchingString, path;

        // no path? no string
        if (_.isEmpty(msgPath) || !_.isString(msgPath)) {
            chalk.yellow('i18n:t() - received an empty path.');
            return '';
        }

        if (blos === undefined) {
            I18n.init();
        }

        // Both jsonpath's dot-notation and bracket-notation start with '$'
        // E.g.: $.store.book.title or $['store']['book']['title']
        // The {{t}} translation helper passes here the full jsonpath with $
        // Backend messages use dot-notation, and the $. is added here
        if (msgPath.substring(0, 1) !== '$') {
            path = '$.' + msgPath;
        } else {
            path = msgPath;
        }

        // jp.value is a jsonpath method. Info:
        // https://www.npmjs.com/package/jsonpath
        candidateString = jp.value(blos, path) || defaultString;
        matchingString = candidateString || {};

        if (_.isObject(matchingString) || _.isEqual(matchingString, {})) {
            if (options.log) {
                logging.error(new errors.IncorrectUsageError({
                    message: `i18n error: path "${msgPath}" was not found`
                }));
            }

            matchingString = blos.errors.errors.anErrorOccurred;
        }

        return matchingString;
    },

    doesTranslationKeyExist: function doesTranslationKeyExist(msgPath) {
        var translation = I18n.findString(msgPath, {log: false});
        return translation !== blos.errors.errors.anErrorOccurred;
    },

    /**
     * Setup i18n support:
     *  - Load proper language file in to memory
     *  - Polyfill node.js if it does not have Intl support or support for a particular locale
     */
    init: function init() {
        // i18n.init() is only called: during Ghost's initialization twice, and when the translation files are not in memory;
        // for the first call, settings for language and theme are not yet available, and English default is used for core;
        // settings are available for the second initialization call, allowing full internationalization of core and theme
        // (see file core/server/index.js for Ghost's initialization, and function i18n.findString above)

        var blosCore, blosTheme, hasBuiltInLocaleData, IntlPolyfill;

        currentLocale = settingsCache.get('default_lang') || 'en';
        activeTheme = settingsCache.get('active_theme') || '';

        // Reading files for current locale and active theme and keeping their content in memory
        // (during Ghost's initialization, when English is the language in settings, the second call
        // to i18n.init() doesn't read again the default English file for core if already in memory).
        if (blos === undefined || currentLocale !== 'en') {
            blosCore = fs.readFileSync(path.join(__dirname, '..', '..', 'translations', currentLocale + '.json'));
            // if translation file is not valid, you will see an error
            try {
                blos = JSON.parse(blosCore);
            } catch (err) {
                blos = undefined;
                throw err;
            }
        }
        if (activeTheme) {
            // Compatibility with both old themes and i18n-capable themes.
            try {
                blosTheme = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'content', 'themes', activeTheme, 'assets', 'translations', activeTheme + '_' + currentLocale + '.json'));
            } catch (err) {
                blosTheme = undefined;
                if (err.code === 'ENOENT') {
                    console.log('File ' + activeTheme + '_' + currentLocale + '.json not found!');
                } else {
                    throw err;
                }
            }
            if (blosTheme !== undefined) {
                // if translation file is not valid, you will see an error
                try {
                    blosTheme = JSON.parse(blosTheme);
                } catch (err) {
                    blosTheme = undefined;
                    throw err;
                }
                blos = _.merge(blos, blosTheme);
            }
        }

        if (global.Intl) {
            // Determine if the built-in `Intl` has the locale data we need.
            hasBuiltInLocaleData = supportedLocales.every(function (locale) {
                return Intl.NumberFormat.supportedLocalesOf(locale)[0] === locale &&
                    Intl.DateTimeFormat.supportedLocalesOf(locale)[0] === locale;
            });

            if (!hasBuiltInLocaleData) {
                // `Intl` exists, but it doesn't have the data we need, so load the
                // polyfill and replace the constructors with need with the polyfill's.
                IntlPolyfill = require('intl');
                Intl.NumberFormat = IntlPolyfill.NumberFormat;
                Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
            }
        } else {
            // No `Intl`, so use and load the polyfill.
            global.Intl = require('intl');
        }
    },
    /**
     * Exporting the current locale (e.g. "en") to make it available for other files,
     * such as core/server/helpers/date.js and core/server/helpers/t_css.js
     */
    locale: function locale() {
        currentLocale = settingsCache.get('default_lang') || 'en';
        return currentLocale;
    }
};

module.exports = I18n;
