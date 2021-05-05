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
const errors = require('@tryghost/errors');
const logging = require('../logging');

class I18n {
    constructor(options = {}) {
        this._locale = options.locale || this.defaultLocale();
        this._stringMode = options.stringMode || 'dot';
        this._strings = null;
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

    _loadStrings() {
        let strings;
        // Reading translation file for messages from core .json files and keeping its content in memory
        // The English file is always loaded, until back-end translations are enabled in future versions.
        try {
            strings = this._readStringsFile(__dirname, 'translations', `${this.defaultLocale()}.json`);
        } catch (err) {
            strings = null;
            throw err;
        }

        return strings;
    }

    /**
     * Check if a key exists in the loaded strings
     * @param {String} msgPath
     */
    doesTranslationKeyExist(msgPath) {
        const translation = this._findString(msgPath, {log: false});
        return translation !== this._fallbackError();
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
        } catch (error) {
            throw new errors.IncorrectUsageError({message: `i18n.t() called with an invalid path: ${msgPath}`});
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
        if (msgPath.length === 0 || !isString(msgPath)) {
            logging.warn('i18n.t() - received an empty path.');
            return '';
        }

        // If not in memory, load translations for core
        if (isNil(this._strings)) {
            throw new errors.IncorrectUsageError({message: `i18n was used before it was initialised with key ${msgPath}`});
        }

        candidateString = this._getCandidateString(msgPath);

        matchingString = candidateString || {};

        if (isObject(matchingString) || isEqual(matchingString, {})) {
            if (options.log) {
                logging.error(new errors.IncorrectUsageError({
                    message: `i18n error: path "${msgPath}" was not found`
                }));
            }

            matchingString = this._fallbackError();
        }

        return matchingString;
    }

    /**
     * Resolve filepath, read file, and attempt a parse
     * Error handling to be done by consumer
     *
     * @param  {...String} pathParts
     */
    _readStringsFile(...pathParts) {
        const content = fs.readFileSync(path.join(...pathParts));
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
            logging.error(err.message);

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

    /**
     * A really basic error for if everything goes wrong
     */
    _fallbackError() {
        return get(this._strings, 'errors.errors.anErrorOccurred', 'An error occurred');
    }
}

module.exports = I18n;
