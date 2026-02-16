// @ts-check
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const {ESLint} = require('eslint');
const glob = require('glob');
const {promisify} = require('util');
const {readFileSync, writeFileSync} = require('fs');

const LOCALES_ROOT = path.join(__dirname, '..', 'locales');

/**
 * @typedef {{
    results: import('eslint').ESLint.LintResult[];
    errorCount: number;
    ignoreAllFlagProvidedWithoutFixFlag: boolean;
 }} LintSummary

 * @typedef {
    'ghost/i18n/no-unused-variables' |
    'ghost/i18n/no-undefined-variables' |
    'ghost/i18n/no-invalid-translations' |
    'ghost/i18n/no-unused-ignores'
   } GhostI18nLintRule
 */

class File {
    /**
     * @param {string} filePath
     * @param {string} source
     */
    constructor(filePath, source) {
        this.path = filePath;
        this.relativePath = path.relative(LOCALES_ROOT, filePath);
        this.source = source;
        this.parsed = JSON.parse(source);
        this.locale = this._extractLocale(filePath);
        /** @private */
        this._analysis = null;
    }

    /**
     * Returns the probabilistic position of the given text in the file.
     * @param {string} text
     * @param {'key' | 'value'} textType
     * @returns {{line: number, column: number}}
     */
    getPosition(text, textType) {
        return this._analyzedSource()[textType][text] ?? {line: 0, column: 0};
    }

    /**
     * Returns a probabilistic location of keys and values in the file
     * Assumes the file contains one key/value pair per line
     * @private
     */
    _analyzedSource() {
        if (this._analysis) {
            return this._analysis;
        }

        const keys = {};
        const values = {};

        const lines = this.source.split('\n');
        const kvSeparator = /"\s*:\s*"/;
        lines.shift();
        lines.pop();

        // Since we shifted the array, start at 1
        let index = 1;
        for (const line of lines) {
            index += 1;
            const [keyMatch, valueMatch] = line.split(kvSeparator);
            if (!keyMatch || !valueMatch) {
                continue;
            }

            const key = keyMatch.split('"')[1];
            const value = valueMatch.split('"')[0];
            keys[key] = {line: index, column: line.indexOf(key)};
            values[value] = {line: index, column: line.indexOf(value, keyMatch.length + 1)};
        }

        this._analysis = {key: keys, value: values};
        return this._analysis;
    }

    /**
     * Extracts the locale from the file path. Assumes the file structure is $LOCALE_ROOT/$LOCAL/$NAMESPACE.json
     * @param {string} filePath
     */
    _extractLocale(filePath) {
        const directory = path.dirname(filePath);
        return directory.slice(directory.lastIndexOf('/') + 1);
    }
}

/**
 * Reads and transforms an ignore file into a Map.
 * Keys follow the format of `rule:locale/namespace:key`.
 * The value is the index which can be used for updating the ignore file.
 * @param {File} ignoreFile
 */
function parseIgnores(ignoreFile) {
    const response = new Map();
    ignoreFile.parsed.overrides ??= {};
    const ignores = ignoreFile.parsed.overrides;
    for (const [rule, ignored] of Object.entries(ignores)) {
        assert(Array.isArray(ignored), `Expected .overrides.${rule} to be an Array`);
        for (const [index, ignore] of ignored.entries()) {
            assert(typeof ignore === 'object', `Expected .overrides.${rule}[${index}] to be an Object`);
            assert(typeof ignore.file === 'string', `Expected .overrides.${rule}[${index}].file to be a String`);
            assert(typeof ignore.key === 'string', `Expected .overrides.${rule}[${index}].key to be a String`);
            assert(typeof ignore.comment === 'string', `Expected .overrides.${rule}[${index}].comment to be a String`);
            assert(ignore.comment, `Expected .overrides.${rule}[${index}].comment to contain a comment`);

            response.set(`${rule}:${ignore.file}:${ignore.key}`, index);
        }
    }

    return response;
}

class LinterContext {
    /**
     * @param {string} ignoreFile
     */
    constructor(ignoreFile) {
        this.ignoreAll = process.argv.includes('--unsafe-ignore-all');
        this.applyFixes = process.argv.includes('--fix');

        /** @type {LintSummary} */
        this.summary = {
            results: [],
            errorCount: 0,
            ignoreAllFlagProvidedWithoutFixFlag: this.ignoreAll && !this.applyFixes
        };

        /** @type {File | null} */
        this.file = null;

        this._cwd = process.cwd();

        /** @type {import('eslint').ESLint.LintResult | null} */
        this._currentResult = null;
        this._currentResultIndex = -1;
        this._currentMessageIndex = 0;

        this._ignoreFile = new File(ignoreFile, readFileSync(ignoreFile, 'utf8'));
        this._ignoredRules = parseIgnores(this._ignoreFile);
        this._unusedIgnores = new Map(this._ignoredRules);

        /**
         * @type {{resultIndex: number; messageIndex: number; fix: (overrides: any) => void;}[]}
         */
        this._fixes = [];
    }

    /**
    * @param {string} message
    * @param {string} key
    * @param {GhostI18nLintRule} ruleName
    * @param {number} line
    * @param {number} column
    * @param {(ignores: any) => void} [fix]
    */
    reportTranslationError(message, key, ruleName, line, column, fix = undefined) {
        const ignoreKey = `${ruleName}:${this.relativeFilePath}:${key}`;
        this._unusedIgnores.delete(ignoreKey);
        if (!this._ignoredRules.has(ignoreKey)) {
            this._reportError(message, ruleName, line, column, fix);
        }
    }

    /**
     * @param {string} text
     * @param {'key' | 'value'} textType
     */
    getPositionForText(text, textType) {
        assert(this.file, 'setFile() should have been called');
        return this.file.getPosition(text, textType);
    }

    /**
     * @param {File} file
    */
    setFile(file) {
        this.file = file;
        this._currentMessageIndex = 0;
        this._currentResultIndex += 1;
        this.summary.errorCount += this._currentResult?.errorCount ?? 0;
        this._currentResult = {
            filePath: path.relative(this._cwd, file.path),
            messages: [],

            errorCount: 0,
            warningCount: 0,
            fixableErrorCount: 0,
            fixableWarningCount: 0,
            usedDeprecatedRules: [],
            fatalErrorCount: 0,
            suppressedMessages: []
        };
        this.summary.results.push(this._currentResult);
    }

    get relativeFilePath() {
        assert(this.file, 'setFile() should have been called');
        return this.file.relativePath;
    }

    complete() {
        assert(this._currentResult, 'setFile() should have been called');
        this.summary.errorCount += this._currentResult.errorCount;

        this._reportUnusedIgnores();

        if (this.applyFixes) {
            this._applyFixes();
        }
    }

    /**
     * @private
     * @param {string} message
     * @param {GhostI18nLintRule} ruleName
     * @param {number} line
     * @param {number} column
     * @param {(ignores: any) => void} [fix]
     */
    _reportError(message, ruleName, line, column, fix = undefined) {
        assert(this._currentResult, '`setFile` should have been called');
        this._currentResult.errorCount += 1;
        this._currentMessageIndex = this._currentResult.messages.length;
        this._currentResult.messages.push({
            ruleId: ruleName,
            severity: 2, // Error
            message,
            line,
            column
        });

        if (fix) {
            this._fixes.push({fix, resultIndex: this._currentResultIndex, messageIndex: this._currentMessageIndex});
        }
    }

    /** @private */
    _reportUnusedIgnores() {
        this.setFile(this._ignoreFile);
        for (const [key, index] of this._unusedIgnores.entries()) {
            const [rule, file, translation] = key.split(':');
            this._reportError(
                `Index ${index} for rule "${rule}" is not used.\n\tFile: ./locales/${file}\n\tkey: "${translation}"`,
                'ghost/i18n/no-unused-ignores',
                0,
                0,
                ignores => ignores[rule][index] = null
            );
        }
    }

    /** @private */
    _applyFixes() {
        const newIgnoreFile = structuredClone(this._ignoreFile.parsed);
        const resultsToFilter = new Set();
        for (const {fix, resultIndex, messageIndex} of this._fixes) {
            this.summary.errorCount -= 1;
            fix(newIgnoreFile.overrides);
            // @ts-expect-error will be filtered afterwards
            this.summary.results[resultIndex].messages[messageIndex] = null;
            resultsToFilter.add(resultIndex);
        }

        console.log(`Applied ${this._fixes.length} fixes`); // eslint-disable-line no-console

        for (const resultIndex of resultsToFilter) {
            this.summary.results[resultIndex].messages = this.summary.results[resultIndex].messages.filter(Boolean);
        }

        for (const [rule, ignored] of Object.entries(newIgnoreFile.overrides)) {
            const updatedValue = ignored.filter(Boolean);
            if (updatedValue.length === 0) {
                delete newIgnoreFile.overrides[rule];
            } else {
                newIgnoreFile.overrides[rule] = updatedValue;
            }
        }

        const sortedOverrideKeys = Array.from(Object.keys(newIgnoreFile.overrides));
        sortedOverrideKeys.sort();

        const newOverrides = {};
        for (const rule of sortedOverrideKeys) {
            newOverrides[rule] = newIgnoreFile.overrides[rule];
        }

        newIgnoreFile.overrides = newOverrides;

        writeFileSync(this._ignoreFile.path, JSON.stringify(newIgnoreFile, null, 4));
    }
}

/**
 * Formats and logs the lint results. If there are any errors, the exit code will be 1
 * @param {LintSummary} summary
 */
async function exitWithSummary(summary) {
    const formatter = await new ESLint().loadFormatter();
    const formattedResults = await formatter.format(summary.results, {cwd: '', rulesMeta: {}});

    if (formattedResults) {
        console.log(formattedResults); // eslint-disable-line no-console
    }

    if (summary.ignoreAllFlagProvidedWithoutFixFlag) {
        console.warn( // eslint-disable-line no-console
            '--unsafe-ignore-all was provided without --fix; errors were not ignored'
        );
    }

    if (summary.errorCount > 0) {
        console.log( // eslint-disable-line no-console
            `\nNote: Since JSON doesn't support comments, use test/i18n-ignore.json to waive messages.\n\n`
        );
        process.exit(1);
    }

    process.exit(0);
}

/**
 * Extracts translations variables and any invalid interpolations from a string
 * @param {string} string the translation to parse
 */
function parseTranslationString(string) {
    const START = 0;
    const IN_VARIABLE = 1;
    const errors = [];

    let state = START;
    let currentVariable = '';
    let variableStartColumn = 0;
    const variables = new Map();

    // Use 1-indexed iterators since column is used a lot more than index
    for (let column = 1; column <= string.length; column++) {
        const character = string[column - 1];
        if (character === '{') {
            if (state === START) {
                state = IN_VARIABLE;
                // The brace is at the current column; the variable starts at the next column
                variableStartColumn = column + 1;
            } else {
                errors.push({message: 'Unexpected "{" in variable', column});
            }
        } else if (character === '}') {
            if (state === IN_VARIABLE) {
                state = START;
                variables.set(currentVariable, variableStartColumn);
                currentVariable = '';
            } else {
                errors.push({message: 'Unexpected "}" in string', column});
            }
        } else if (state === IN_VARIABLE) {
            currentVariable += character;
        }
    }

    if (state === IN_VARIABLE) {
        errors.push({message: 'Unclosed {', column: variableStartColumn});
    }

    return {variables, errors};
}

async function *getTranslationFiles() {
    // TODO: use fs.glob when Node 22 is used in CI. Once it's available this function
    // can be converted to an async function instead of async generator.
    const globs = await promisify(glob)(`${LOCALES_ROOT}/*/*.json`);
    for (const translationFile of globs) {
        yield translationFile;
    }
}

/**
 * Adds a translation error to {ignores}
 * @param {Record<string, any>} ignores
 * @param {string} rule
 * @param {string} file
 * @param {string} key
 */
function ignoreTranslationError(ignores, rule, file, key) {
    ignores[rule] ??= [];
    ignores[rule].push({
        file,
        key,
        comment: 'FIXME: This error was automatically ignored. Please update the translation or this comment.'
    });
}

/**
 * Reports all errors for a translation pair
 * @param {string} key the untranslated key to analyze
 * @param {string} translated the translated value to analyze
 * @param {LinterContext} context
 */
function analyzeSingleTranslation(key, translated, context) {
    const {errors: keyErrors, variables: defines} = parseTranslationString(key);

    // Report key parsing errors only for English translations.
    // I18next is responsible for keeping all other locales in sync.
    if (context.file?.locale === 'en') {
        const {line, column} = context.getPositionForText(key, 'key');
        for (const error of keyErrors) {
            const rule = 'ghost/i18n/no-invalid-translations';
            context.reportTranslationError(error.message, key, rule, line, column + error.column);
        }
    }

    if (!translated) {
        return;
    }

    const {errors, variables: used} = parseTranslationString(translated);

    {
        const {line, column} = context.getPositionForText(key, 'value');
        for (const error of errors) {
            const rule = 'ghost/i18n/no-invalid-translations';
            context.reportTranslationError(error.message, key, rule, line, column + error.column);
        }
    }

    for (const [define, columnInKey] of defines.entries()) {
        // Use delete to remove the variable so `used` will only contain unused variables after this loop
        if (!used.delete(define)) {
            const rule = 'ghost/i18n/no-unused-variables';
            const file = context.relativeFilePath;
            const {line, column} = context.getPositionForText(key, 'key');
            context.reportTranslationError(
                `Translation does not use variable "${define}"`,
                key,
                rule,
                line,
                column + columnInKey,
                context.ignoreAll ? ignores => ignoreTranslationError(ignores, rule, file, key) : undefined
            );
        }
    }

    const {line, column} = context.getPositionForText(translated, 'value');
    for (const [unknownVariable, columnInTranslation] of used.entries()) {
        const rule = 'ghost/i18n/no-undefined-variables';
        const file = context.relativeFilePath;
        context.reportTranslationError(
            `Translation uses unknown variable "${unknownVariable}"`,
            key,
            rule,
            line,
            column + columnInTranslation,
            context.ignoreAll ? ignores => ignoreTranslationError(ignores, rule, file, key) : undefined
        );
    }
}

async function analyze() {
    const context = new LinterContext(path.join(__dirname, './i18n-ignores.json'));
    for await (const translationFile of await getTranslationFiles()) {
        const file = new File(translationFile, await fs.readFile(translationFile, 'utf8'));
        context.setFile(file);
        for (const [key, translated] of Object.entries(file.parsed)) {
            analyzeSingleTranslation(key, translated, context);
        }
    }

    context.complete();

    return context.summary;
}

if (require.main === module) {
    analyze().then(results => exitWithSummary(results)).catch((error) => {
        console.error(error); // eslint-disable-line no-console
        process.exit(1);
    });
}

module.exports = {
    analyze
};
