const errors = require('@tryghost/errors');
const {i18n, events} = require('../../../server/lib/common');
const logging = require('../../../shared/logging');
const settingsCache = require('../../../server/services/settings/cache');
const config = require('../../../shared/config');
const active = require('./active');
const jp = require('jsonpath');

const isNil = require('lodash/isNil');

class ThemeI18n extends i18n.I18n {
    constructor(locale) {
        super(locale);
    }

    /**
     * Setup i18n support for themes:
     *  - Load correct language file into memory
     *
     * @param {String} activeTheme - name of the currently loaded theme
     */
    init(activeTheme) {
        // This function is called during theme initialization, and when switching language or theme.
        const currentLocale = this._loadLocale();

        // Reading file for current locale and active theme and keeping its content in memory
        if (activeTheme) {
            // Reading translation file for theme .hbs templates.
            // Compatibility with both old themes and i18n-capable themes.
            // Preventing missing files.
            this._strings = this._tryGetLocale(activeTheme, currentLocale);

            if (!this._strings && currentLocale !== this.defaultLocale()) {
                logging.warn(`Falling back to locales/${this.defaultLocale()}.json.`);
                this._strings = this._tryGetLocale(activeTheme, this.defaultLocale());
            }
        }

        if (isNil(this._strings)) {
            // even if empty, themeStrings must be an object for jp.value
            this._strings = {};
        }

        this._initializeIntl();
    }

    /**
     *  Attempt to load a local file and parse the contents
     *
     * @param {String} activeTheme
     * @param {String} locale
     */
    _tryGetLocale(activeTheme, locale) {
        try {
            return this._readStringsFile(config.getContentPath('themes'), activeTheme, 'locales', `${locale}.json`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                if (locale !== this.defaultLocale()) {
                    logging.warn(`Theme's file locales/${locale}.json not found.`);
                }
            } else if (err instanceof SyntaxError) {
                logging.error(new errors.IncorrectUsageError({
                    err,
                    message: `Unable to parse locales/${locale}.json. Please check that it is valid JSON.`
                }));
            } else {
                throw err;
            }
        }
    }

    /**
     * Load the current locale out of the settings cache
     */
    _loadLocale() {
        this._locale = settingsCache.get('lang');
        return this._locale;
    }

    /**
     * Do the lookup with JSON path
     *
     * @param {String} msgPath
     */
    _getCandidateString(msgPath) {
        // Both jsonpath's dot-notation and bracket-notation start with '$'
        // E.g.: $.store.book.title or $['store']['book']['title']
        // The {{t}} translation helper passes the default English text
        // The full Unicode jsonpath with '$' is built here
        // jp.stringify and jp.value are jsonpath methods
        // Info: https://www.npmjs.com/package/jsonpath
        let path = jp.stringify(['$', msgPath]);
        return jp.value(this._strings, path) || msgPath;
    }
}

let themeI18n = new ThemeI18n();

// /**
//  * When active theme changes, we reload theme translations
//  * We listen on the service event, because of the following known case:
//  *  1. you override a theme, which is already active
//  *  2. The data has not changed, no event is triggered.
//  */
events.on('services.themes.activated', function (activeTheme) {
    themeI18n.init(activeTheme);
});

/**
 * When locale changes, we reload theme translations
 */
events.on('settings.lang.edited', function () {
    themeI18n.init(active.get().name);
});

module.exports = themeI18n;
