/* global Intl */

const supportedLocales = ['en'],
    chalk = require('chalk'),
    fs = require('fs-extra'),
    MessageFormat = require('intl-messageformat'),
    jp = require('jsonpath'),
    isString = require('lodash/isString'),
    isObject = require('lodash/isObject'),
    isEqual = require('lodash/isEqual'),
    merge = require('lodash/merge'),
    path = require('path'),
    config = require('../../config'),
    errors = require('./errors'),
    events = require('./events'),
    logging = require('./logging'),
    settingsCache = require('../../services/settings/cache'),
    _private = {};

// currentLocale, dynamically based on overall settings (key = "default_locale") in the settings db table
// (during Ghost's initialization, settings available inside i18n functions below; see core/server/index.js)
//
// E.g.: en = English (default), es = Spanish, en-US = American English, etc.
// Standard:
// Language tags in HTML and XML
// https://www.w3.org/International/articles/language-tags/
//
// The corresponding translation files should be at content/themes/mytheme/locales/es.json, etc.
let currentLocale,
    activeTheme,
    coreStrings,
    themeStrings,
    I18n;

/**
 * When active theme changes, we reload theme translations
 * We listen on the service event, because of the following known case:
 *  1. you override a theme, which is already active
 *  2. The data has not changed, no event is triggered.
 */
events.on('services.themes.activated', function () {
    I18n.loadThemeTranslations();
});

/**
 * When locale changes, we reload theme translations
 */
events.on('settings.default_locale.edited', function () {
    I18n.loadThemeTranslations();
});

I18n = {

    /**
     * Helper method to find and compile the given data context with a proper string resource.
     *
     * @param {string} path Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @param {object} [bindings]
     * @returns {string}
     */
    t: function t(path, bindings) {
        let string, isTheme, msg;

        currentLocale = I18n.locale();
        if (bindings !== undefined) {
            isTheme = bindings.isThemeString;
            delete bindings.isThemeString;
        }
        string = I18n.findString(path, {isThemeString: isTheme});

        // If the path returns an array (as in the case with anything that has multiple paragraphs such as emails), then
        // loop through them and return an array of translated/formatted strings. Otherwise, just return the normal
        // translated/formatted string.
        if (Array.isArray(string)) {
            msg = [];
            string.forEach(function (s) {
                let m = new MessageFormat(s, currentLocale);

                try {
                    m.format(bindings);
                } catch (err) {
                    logging.error(err.message);

                    // fallback
                    m = new MessageFormat(coreStrings.errors.errors.anErrorOccurred, currentLocale);
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
                msg = new MessageFormat(coreStrings.errors.errors.anErrorOccurred, currentLocale);
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
        const options = merge({log: true}, opts || {});
        let candidateString, matchingString, path;

        // no path? no string
        if (msgPath.length === 0 || !isString(msgPath)) {
            chalk.yellow('i18n.t() - received an empty path.');
            return '';
        }

        // If not in memory, load translations for core
        if (coreStrings === undefined) {
            I18n.init();
        }

        if (options.isThemeString) {
            // If not in memory, load translations for theme
            if (themeStrings === undefined) {
                I18n.loadThemeTranslations();
            }
            // Both jsonpath's dot-notation and bracket-notation start with '$'
            // E.g.: $.store.book.title or $['store']['book']['title']
            // The {{t}} translation helper passes the default English text
            // The full Unicode jsonpath with '$' is built here
            // jp.stringify and jp.value are jsonpath methods
            // Info: https://www.npmjs.com/package/jsonpath
            path = jp.stringify(['$', msgPath]);
            candidateString = jp.value(themeStrings, path) || msgPath;
        } else {
            // Backend messages use dot-notation, and the '$.' prefix is added here
            // While bracket-notation allows any Unicode characters in keys for themes,
            // dot-notation allows only word characters in keys for backend messages
            // (that is \w or [A-Za-z0-9_] in RegExp)
            path = `$.${msgPath}`;
            candidateString = jp.value(coreStrings, path);
        }

        matchingString = candidateString || {};

        if (isObject(matchingString) || isEqual(matchingString, {})) {
            if (options.log) {
                logging.error(new errors.IncorrectUsageError({
                    message: `i18n error: path "${msgPath}" was not found`
                }));
            }

            matchingString = coreStrings.errors.errors.anErrorOccurred;
        }

        return matchingString;
    },

    doesTranslationKeyExist: function doesTranslationKeyExist(msgPath) {
        const translation = I18n.findString(msgPath, {log: false});
        return translation !== coreStrings.errors.errors.anErrorOccurred;
    },

    /**
     * Setup i18n support:
     *  - Load proper language file into memory
     */
    init: function init() {
        // This function is called during Ghost's initialization.
        // Reading translation file for messages from core .js files and keeping its content in memory
        // The English file is always loaded, until back-end translations are enabled in future versions.
        // Before that, see previous tasks on issue #6526 (error codes or identifiers, error message
        // translation at the point of display...)
        coreStrings = fs.readFileSync(path.join(__dirname, '..', '..', 'translations', 'en.json'));

        // if translation file is not valid, you will see an error
        try {
            coreStrings = JSON.parse(coreStrings);
        } catch (err) {
            coreStrings = undefined;
            throw err;
        }

        _private.initializeIntl();
    },

    /**
     * Setup i18n support for themes:
     *  - Load proper language file into memory
     */
    loadThemeTranslations: function loadThemeTranslations() {
        // This function is called during theme initialization, and when switching language or theme.
        currentLocale = I18n.locale();
        activeTheme = settingsCache.get('active_theme');

        // Reading file for current locale and active theme and keeping its content in memory
        if (activeTheme) {
            // Reading translation file for theme .hbs templates.
            // Compatibility with both old themes and i18n-capable themes.
            // Preventing missing files.
            try {
                themeStrings = fs.readFileSync(path.join(config.getContentPath('themes'), activeTheme, 'locales', currentLocale + '.json'));
            } catch (err) {
                themeStrings = undefined;
                if (err.code === 'ENOENT') {
                    logging.warn(`Theme's file locales/${currentLocale}.json not found.`);
                } else {
                    throw err;
                }
            }
            if (themeStrings === undefined && currentLocale !== 'en') {
                logging.warn('Falling back to locales/en.json.');
                try {
                    themeStrings = fs.readFileSync(path.join(config.getContentPath('themes'), activeTheme, 'locales', 'en.json'));
                } catch (err) {
                    themeStrings = undefined;
                    if (err.code === 'ENOENT') {
                        logging.warn('Theme\'s file locales/en.json not found.');
                    } else {
                        throw err;
                    }
                }
            }
            if (themeStrings !== undefined) {
                // if translation file is not valid, you will see an error
                try {
                    themeStrings = JSON.parse(themeStrings);
                } catch (err) {
                    themeStrings = undefined;
                    throw err;
                }
            }
        }

        if (themeStrings === undefined) {
            // even if empty, themeStrings must be an object for jp.value
            themeStrings = {};
        }

        _private.initializeIntl();
    },

    /**
     * Exporting the current locale (e.g. "en") to make it available for other files as well,
     * such as core/server/helpers/date.js and core/server/helpers/lang.js
     */
    locale: function locale() {
        return settingsCache.get('default_locale');
    }
};

/**
 * Setup i18n support:
 *  - Polyfill node.js if it does not have Intl support or support for a particular locale
 */
_private.initializeIntl = function initializeIntl() {
    let hasBuiltInLocaleData, IntlPolyfill;

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
};

module.exports = I18n;
