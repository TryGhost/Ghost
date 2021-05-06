const errors = require('@tryghost/errors');
const i18n = require('../../../../shared/i18n');

class ThemeI18n extends i18n.I18n {
    /**
     * @param {objec} [options]
     * @param {string} basePath - the base path for the translation directory (e.g. where themes live)
     * @param {string} [locale] - a locale string
     */
    constructor(options = {}) {
        super(options);
        // We don't care what gets passed in, themes use fulltext mode
        this._stringMode = 'fulltext';
    }

    /**
     * Setup i18n support for themes:
     *  - Load correct language file into memory
     *
     * @param {object} options
     * @param {String} options.activeTheme - name of the currently loaded theme
     * @param {String} options.locale - name of the currently loaded locale
     *
     */
    init({activeTheme, locale} = {}) {
        // This function is called during theme initialization, and when switching language or theme.
        this._locale = locale || this._locale;
        this._activetheme = activeTheme || this._activetheme;

        super.init();
    }

    _translationFileDirs() {
        return [this.basePath, this._activetheme, 'locales'];
    }

    _handleUninitialisedError(key) {
        throw new errors.IncorrectUsageError({message: `Theme translation was used before it was initialised with key ${key}`});
    }

    _handleFallbackToDefault() {
        this._logging.warn(`Theme translations falling back to locales/${this.defaultLocale()}.json.`);
    }

    _handleMissingFileError(locale) {
        if (locale !== this.defaultLocale()) {
            this._logging.warn(`Theme translations file locales/${locale}.json not found.`);
        }
    }
    _handleInvalidFileError(locale, err) {
        this._logging.error(new errors.IncorrectUsageError({
            err,
            message: `Theme translations unable to parse locales/${locale}.json. Please check that it is valid JSON.`
        }));
    }

    _handleEmptyKeyError() {
        this._logging.warn('Theme translations {{t}} helper called without a translation key.');
    }

    _handleMissingKeyError() {
        // This case cannot be reached in themes as we use the key as the fallback
    }

    _handleInvalidKeyError(key, err) {
        throw new errors.IncorrectUsageError({
            err,
            message: `Theme translations {{t}} helper called with an invalid translation key: ${key}`
        });
    }
}

module.exports = ThemeI18n;
