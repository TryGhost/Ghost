const errors = require('@tryghost/errors');
const i18n = require('../../../../shared/i18n');
const logging = require('../../../../shared/logging');
const settingsCache = require('../../../../server/services/settings/cache');
const config = require('../../../../shared/config');

const isNil = require('lodash/isNil');

class ThemeI18n extends i18n.I18n {
    constructor(options = {}) {
        super(options);
        // We don't care what gets passed in, themes use fulltext mode
        this._stringMode = 'fulltext';
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
}

module.exports = ThemeI18n;
