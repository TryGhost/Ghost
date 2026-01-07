const errors = require('@tryghost/errors');
const i18nLib = require('@tryghost/i18n');
const path = require('path');
const fs = require('fs-extra');

class ThemeI18n {
    /**
     * @param {object} options
     * @param {string} options.basePath - the base path for the translation directory (e.g. where themes live)
     * @param {string} [options.locale] - a locale string
     */
    constructor(options) {
        if (!options || !options.basePath) {
            throw new errors.IncorrectUsageError({message: 'basePath is required'});
        }
        this._basePath = options.basePath;
        this._locale = options.locale || 'en';
        this._activeTheme = null;
        this._i18n = null;
    }

    /**
     * BasePath getter & setter used for testing
     */
    set basePath(basePath) {
        this._basePath = basePath;
    }

    get basePath() {
        return this._basePath;
    }

    /**
     * Setup i18n support for themes:
     *  - Load correct language file into memory
     *
     * @param {object} options
     * @param {string} options.activeTheme - name of the currently loaded theme
     * @param {string} options.locale - name of the currently loaded locale
     */
    init(options) {
        if (!options || !options.activeTheme) {
            throw new errors.IncorrectUsageError({message: 'activeTheme is required'});
        }

        this._locale = options.locale || this._locale;
        this._activeTheme = options.activeTheme;

        const themeLocalesPath = path.join(this._basePath, this._activeTheme, 'locales');

        // Check if the theme path exists
        const themePathExists = fs.existsSync(themeLocalesPath);

        if (!themePathExists) {
            // If the theme path doesn't exist, initialize with an empty resource
            // this maintains interpolation of keys when locales files are missing.
            this._i18n = i18nLib(this._locale, 'theme', {});
            return;
        }

        // Initialize i18n with the theme path
        // Note: @tryghost/i18n uses synchronous file operations internally
        // This is fine in production but in tests we need to ensure the files exist first

        const localePath = path.join(themeLocalesPath, `${this._locale}.json`);
        const localeExists = fs.existsSync(localePath);

        if (localeExists) {
            // Initialize i18n
            this._i18n = i18nLib(this._locale, 'theme', {themePath: themeLocalesPath});
            return;
        } 
            
        // If the requested locale fails, try English as fallback
        const enPath = path.join(themeLocalesPath, 'en.json');
        const enExists = fs.existsSync(enPath);

        if (enExists) {
            this._i18n = i18nLib('en', 'theme', {themePath: themeLocalesPath});
            return;
        }   
        
        // If both fail, initialize the empty resource so that i18next can handle interpolation.
        this._i18n = i18nLib(this._locale, 'theme', {});        
    }

    /**
     * Helper method to find and compile the given data context with a proper string resource.
     *
     * @param {string} key - The translation key
     * @param {object} [bindings] - Optional bindings for the translation
     * @returns {string}
     */
    t(key, bindings) {
        if (!this._i18n) {
            throw new errors.IncorrectUsageError({message: `Theme translation was used before it was initialised with key ${key}`});
        }
        const result = this._i18n.t(key, bindings);
        return typeof result === 'string' ? result : String(result);
    }
}

module.exports = ThemeI18n;