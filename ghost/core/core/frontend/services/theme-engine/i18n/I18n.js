const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const fs = require('fs-extra');
const path = require('path');
const MessageFormat = require('intl-messageformat');
const jp = require('jsonpath');
const isString = require('lodash/isString');
const isObject = require('lodash/isObject');
const isEqual = require('lodash/isEqual');
const isNil = require('lodash/isNil');
const merge = require('lodash/merge');
const get = require('lodash/get');

class I18n {
    /**
     * @param {object} [options]
     * @param {string} options.basePath - the base path to the translations directory
     * @param {string} [options.locale] - a locale string
     * @param {string} [options.stringMode] - which mode our translation keys use
     */
    constructor(options = {}) {
        this._basePath = options.basePath || __dirname;
        this._locale = options.locale || this.defaultLocale();
        this._stringMode = options.stringMode || 'dot';

        this._strings = null;
    }

    /**
     * BasePath getter & setter used for testing
     */
    set basePath(basePath) {
        this._basePath = basePath;
    }

    /**
     * Need to call init after this
     */
    get basePath() {
        return this._basePath;
    }

    /**
     * English is our default locale
     */
    defaultLocale() {
        return 'en';
    }

    supportedLocales() {
        return [this.defaultLocale()];
    }

    /**
     * Exporting the current locale (e.g. "en") to make it available for other files as well,
     * such as core/frontend/helpers/date.js and core/frontend/helpers/lang.js
     */
    locale() {
        return this._locale;
    }

    /**
     * Helper method to find and compile the given data context with a proper string resource.
     *
     * @param {string} translationPath Path within the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @param {object} [bindings]
     * @returns {string}
     */
    t(translationPath, bindings) {
        let string;
        let msg;

        string = this._findString(translationPath);

        // If the path returns an array (as in the case with anything that has multiple paragraphs such as emails), then
        // loop through them and return an array of translated/formatted strings. Otherwise, just return the normal
        // translated/formatted string.
        if (Array.isArray(string)) {
            msg = [];
            string.forEach(function (s) {
                msg.push(this._formatMessage(s, bindings));
            });
        } else {
            msg = this._formatMessage(string, bindings);
        }

        return msg;
    }

    /**
     * Setup i18n support:
     *  - Load proper language file into memory
     */
    init() {
        this._strings = this._loadStrings();

        this._initializeIntl();
    }

    /**
     * Attempt to load strings from a file
     *
     * @param {string} [locale]
     * @returns {object} strings
     */
    _loadStrings(locale) {
        locale = locale || this.locale();

        try {
            return this._readTranslationsFile(locale);
        } catch (err) {
            if (err.code === 'ENOENT') {
                this._handleMissingFileError(locale);

                if (locale !== this.defaultLocale()) {
                    this._handleFallbackToDefault();
                    return this._loadStrings(this.defaultLocale());
                }
            } else if (err instanceof SyntaxError) {
                this._handleInvalidFileError(locale, err);
            } else {
                throw err;
            }

            // At this point we've done all we can and strings must be an object
            return {};
        }
    }

    /**
     * Do the lookup within the JSON file using jsonpath
     *
     * @param {String} msgPath
     */
    _getCandidateString(msgPath) {
        // Our default string mode is "dot" for dot-notation, e.g. $.something.like.this used in the backend
        // Both jsonpath's dot-notation and bracket-notation start with '$' E.g.: $.store.book.title or $['store']['book']['title']
        // While bracket-notation allows any Unicode characters in keys (i.e. for themes / fulltext mode) E.g. $['Read more']
        // dot-notation allows only word characters in keys for backend messages (that is \w or [A-Za-z0-9_] in RegExp)
        let jsonPath = `$.${msgPath}`;
        let fallback = null;

        if (this._stringMode === 'fulltext') {
            jsonPath = jp.stringify(['$', msgPath]);
            // In fulltext mode we can use the passed string as a fallback
            fallback = msgPath;
        }

        try {
            return jp.value(this._strings, jsonPath) || fallback;
        } catch (err) {
            this._handleInvalidKeyError(msgPath, err);
        }
    }

    /**
     * Parse JSON file for matching locale, returns string giving path.
     *
     * @param {string} msgPath Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @returns {string}
     */
    _findString(msgPath, opts) {
        const options = merge({log: true}, opts || {});
        let candidateString;
        let matchingString;

        // no path? no string
        if (!msgPath || msgPath.length === 0 || !isString(msgPath)) {
            this._handleEmptyKeyError();
            return '';
        }

        // If not in memory, load translations for core
        if (isNil(this._strings)) {
            this._handleUninitialisedError(msgPath);
        }

        candidateString = this._getCandidateString(msgPath);

        matchingString = candidateString || {};

        if (isObject(matchingString) || isEqual(matchingString, {})) {
            if (options.log) {
                this._handleMissingKeyError(msgPath);
            }

            matchingString = this._fallbackError();
        }

        return matchingString;
    }

    _translationFileDirs() {
        return [this.basePath];
    }

    // If we are passed a locale, use that, else use this.locale
    _translationFileName(locale) {
        return `${locale || this.locale()}.json`;
    }

    /**
     * Read the translations file
     * Error handling to be done by consumer
     *
     * @param  {string} locale
     */
    _readTranslationsFile(locale) {
        const filePath = path.join(...this._translationFileDirs(), this._translationFileName(locale));
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    }

    /**
     * Format the string using the correct locale and applying any bindings
     * @param {String} string
     * @param {Object} bindings
     */
    _formatMessage(string, bindings) {
        let currentLocale = this.locale();
        let msg = new MessageFormat(string, currentLocale);

        try {
            msg = msg.format(bindings);
        } catch (err) {
            this._handleFormatError(err);

            // fallback
            msg = new MessageFormat(this._fallbackError(), currentLocale);
            msg = msg.format();
        }

        return msg;
    }

    /**
     * [Private] Setup i18n support:
     *  - Polyfill node.js if it does not have Intl support or support for a particular locale
     */
    _initializeIntl() {
        let hasBuiltInLocaleData;
        let IntlPolyfill;

        if (global.Intl) {
            // Determine if the built-in `Intl` has the locale data we need.
            hasBuiltInLocaleData = this.supportedLocales().every(function (locale) {
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
    }

    _handleUninitialisedError(key) {
        logging.warn(`i18n was used before it was initialised with key ${key}`);
        this.init();
    }

    _handleFormatError(err) {
        logging.error(err.message);
    }

    _handleFallbackToDefault() {
        logging.warn(`i18n is falling back to ${this.defaultLocale()}.json.`);
    }

    _handleMissingFileError(locale) {
        logging.warn(`i18n was unable to find ${locale}.json.`);
    }

    _handleInvalidFileError(locale, err) {
        logging.error(new errors.IncorrectUsageError({
            err,
            message: `i18n was unable to parse ${locale}.json. Please check that it is valid JSON.`
        }));
    }

    _handleEmptyKeyError() {
        logging.warn('i18n.t() was called without a key');
    }

    _handleMissingKeyError(key) {
        logging.error(new errors.IncorrectUsageError({
            message: `i18n.t() was called with a key that could not be found: ${key}`
        }));
    }

    _handleInvalidKeyError(key, err) {
        throw new errors.IncorrectUsageError({
            err,
            message: `i18n.t() called with an invalid key: ${key}`
        });
    }

    /**
     * A really basic error for if everything goes wrong
     */
    _fallbackError() {
        return get(this._strings, 'errors.errors.anErrorOccurred', 'An error occurred');
    }
}

module.exports = I18n;
